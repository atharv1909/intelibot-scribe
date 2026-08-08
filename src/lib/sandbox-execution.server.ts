/* ------------------------------------------------------------------ */
/*  NON-BLOCKING SANDBOX EXECUTION                                     */
/*  Replaces the old blocking `executeVersion` in pipeline.server.ts   */
/*                                                                      */
/*  Why: `await sbx.runCode(...)` inside a single POST /api/pipeline   */
/*  request is bound by Vercel's per-request timeout (60s on Hobby,    */
/*  even 300s on Fluid Compute is not enough for real PyTorch          */
/*  training). E2B sandboxes persist independently of any one HTTP     */
/*  request, so we start the run in the BACKGROUND inside the sandbox, */
/*  return immediately, and let subsequent short polls (each well      */
/*  under the timeout) check on it and reconnect via Sandbox.connect() */
/*  instead of Sandbox.create() — so we never re-run or lose the job.  */
/* ------------------------------------------------------------------ */

import { Sandbox } from "@e2b/code-interpreter";

// ---- shared helpers -------------------------------------------------

function buildAutoInstallHeader(): string {
  return `import subprocess, sys, os

try:
    import torch
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--no-cache-dir", "torch", "torchvision", "--index-url", "https://download.pytorch.org/whl/cpu"], check=False)

_NEEDED_PACKAGES = {
    'kaggle': 'kaggle',
    'pandas': 'pandas',
    'sklearn': 'scikit-learn',
    'PIL': 'pillow',
    'scipy': 'scipy',
    'cv2': 'opencv-python',
    'tqdm': 'tqdm',
}

for _mod, _pip in _NEEDED_PACKAGES.items():
    try:
        __import__(_mod)
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--no-cache-dir", _pip], check=False)

_kkey = os.environ.get("KAGGLE_KEY") or os.environ.get("KAGGLE_API_TOKEN") or os.environ.get("KAGGLE_API_KEY")
_kuser = os.environ.get("KAGGLE_USERNAME") or "atharv0919"
if _kkey:
    os.environ["KAGGLE_KEY"] = _kkey
    os.environ["KAGGLE_API_TOKEN"] = _kkey
    os.environ["KAGGLE_USERNAME"] = _kuser
    try:
        import json, pathlib
        kdir = pathlib.Path.home() / ".kaggle"
        kdir.mkdir(parents=True, exist_ok=True)
        kfile = kdir / "kaggle.json"
        kfile.write_text(json.dumps({"username": _kuser, "key": _kkey, "token": _kkey}))
        os.chmod(kfile, 0o600)
    except Exception:
        pass

`;
}

const SANDBOX_TIMEOUT_MS = 3_500_000; // ~58 min; stays under E2B's 1hr Hobby sandbox cap
const RUN_SCRIPT_PATH = "/tmp/run_experiment.py";
const STDOUT_LOG_PATH = "/tmp/experiment_stdout.log";
const STDERR_LOG_PATH = "/tmp/experiment_stderr.log";
const DONE_MARKER_PATH = "/tmp/experiment_done.marker"; // written last, contains exit code

/**
 * Starts the code executing in the BACKGROUND inside a fresh sandbox and
 * returns immediately with the sandbox id. Does NOT wait for completion.
 */
export async function startSandboxExecution(cleanCode: string): Promise<{
  sandboxId: string | null;
  startedOk: boolean;
  immediateNote?: string;
}> {
  const e2bKey = process.env["E2B_API_KEY"];
  if (!e2bKey) {
    return { sandboxId: null, startedOk: false, immediateNote: "E2B_API_KEY is not configured." };
  }

  try {
    const sbx = await Sandbox.create({
      apiKey: e2bKey,
      envs: {
        KAGGLE_API_TOKEN: process.env["KAGGLE_API_TOKEN"] || process.env["KAGGLE_API_KEY"] || "",
        KAGGLE_USERNAME: process.env["KAGGLE_USERNAME"] || "",
        KAGGLE_KEY: process.env["KAGGLE_KEY"] || process.env["KAGGLE_API_KEY"] || "",
      },
      timeoutMs: SANDBOX_TIMEOUT_MS,
    });

    const codeToRun = `${buildAutoInstallHeader()}\n\n${cleanCode}`;
    await sbx.files.write(RUN_SCRIPT_PATH, codeToRun);

    // Run in the background: redirect stdout/stderr to files, then write
    // a marker file with the exit code once the process actually finishes.
    // This lets a later, separate request poll for completion cheaply
    // (just checking whether the marker file exists) instead of blocking.
    const bgCommand =
      `python3 ${RUN_SCRIPT_PATH} > ${STDOUT_LOG_PATH} 2> ${STDERR_LOG_PATH}; ` +
      `echo $? > ${DONE_MARKER_PATH}`;

    await sbx.commands.run(bgCommand, { background: true });

    // Deliberately do NOT kill the sandbox here — it must stay alive so a
    // later poll can reconnect to it while the background job keeps running.
    return { sandboxId: sbx.sandboxId, startedOk: true };
  } catch (err: any) {
    return { sandboxId: null, startedOk: false, immediateNote: err?.message || String(err) };
  }
}

/**
 * Reconnects to an already-running sandbox and does a CHEAP, non-blocking
 * check: has the background job finished yet? This call itself completes
 * in a couple seconds regardless of how long the underlying training run
 * takes, so it's safe to call from a request bound by a short timeout.
 */
export async function pollSandboxExecution(sandboxId: string): Promise<{
  finished: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}> {
  const e2bKey = process.env["E2B_API_KEY"];
  if (!e2bKey) {
    return { finished: true, success: false, stdout: "", stderr: "", error: "E2B_API_KEY is not configured." };
  }

  try {
    const sbx = await Sandbox.connect(sandboxId, { apiKey: e2bKey });

    // Cheap existence check for the marker file written after the process exits.
    const markerCheck = await sbx.commands.run(
      `test -f ${DONE_MARKER_PATH} && echo EXISTS || echo MISSING`,
    );
    const finished = markerCheck.stdout.includes("EXISTS");

    if (!finished) {
      return { finished: false, success: false, stdout: "", stderr: "" };
    }

    const [exitCodeStr, stdout, stderr] = await Promise.all([
      sbx.files.read(DONE_MARKER_PATH).catch(() => "1"),
      sbx.files.read(STDOUT_LOG_PATH).catch(() => ""),
      sbx.files.read(STDERR_LOG_PATH).catch(() => ""),
    ]);

    const exitCode = parseInt(String(exitCodeStr).trim(), 10);
    const success = exitCode === 0;

    // Now that we've collected the results, the sandbox is no longer needed.
    await sbx.kill().catch(() => {});

    return { finished: true, success, stdout: String(stdout), stderr: String(stderr) };
  } catch (err: any) {
    // Sandbox may have expired (hit SANDBOX_TIMEOUT_MS) or been killed already.
    return {
      finished: true,
      success: false,
      stdout: "",
      stderr: "",
      error: err?.message || String(err),
    };
  }
}

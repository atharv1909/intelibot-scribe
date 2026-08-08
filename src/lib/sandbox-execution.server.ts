import { Sandbox } from "@e2b/code-interpreter";

/**
 * Long-running experiment execution for Intelibot Scribe.
 *
 * Important design:
 *
 * - Vercel request starts the sandbox and returns immediately.
 * - The actual experiment runs as a detached process INSIDE E2B.
 * - Subsequent requests poll the sandbox.
 * - Dependencies are installed ONLY when the generated code actually imports them.
 * - PyTorch is NOT installed unless torch/torchvision/torchaudio is imported.
 * - Kaggle credentials come only from environment variables.
 * - No fake metrics are generated here.
 */

const DEFAULT_SANDBOX_TIMEOUT_MS = 3_500_000;
const DEFAULT_DEPENDENCY_INSTALL_TIMEOUT_SECONDS = 300;

const SANDBOX_TIMEOUT_MS = readPositiveIntEnv(
  "E2B_SANDBOX_TIMEOUT_MS",
  DEFAULT_SANDBOX_TIMEOUT_MS,
);

const DEPENDENCY_INSTALL_TIMEOUT_SECONDS = readPositiveIntEnv(
  "E2B_DEPENDENCY_INSTALL_TIMEOUT_SECONDS",
  DEFAULT_DEPENDENCY_INSTALL_TIMEOUT_SECONDS,
);

const RUN_SCRIPT_PATH = "/tmp/intelibot_experiment.py";
const STDOUT_LOG_PATH = "/tmp/intelibot_experiment.stdout.log";
const STDERR_LOG_PATH = "/tmp/intelibot_experiment.stderr.log";
const DONE_MARKER_PATH = "/tmp/intelibot_experiment.done";
const START_MARKER_PATH = "/tmp/intelibot_experiment.started";

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

/**
 * Encode arbitrary generated Python safely.
 *
 * We deliberately do not inject the generated source into a Python triple
 * quoted string because generated code may itself contain triple quotes.
 */
function encodePython(code: string): string {
  return Buffer.from(code, "utf8").toString("base64");
}

/**
 * The Python bootstrap:
 *
 * 1. Decodes the generated source.
 * 2. Parses imports using AST.
 * 3. Checks whether modules are already installed.
 * 4. Installs only missing packages.
 * 5. Executes the original generated code.
 *
 * This avoids the previous behaviour where every experiment could trigger
 * a PyTorch installation.
 */
function buildExecutionScript(cleanCode: string): string {
  const encoded = encodePython(cleanCode);

  return `import ast
import base64
import importlib.util
import json
import os
import subprocess
import sys
import time
import traceback

USER_CODE = base64.b64decode(${JSON.stringify(encoded)}).decode("utf-8")

PACKAGE_MAP = {
    "sklearn": "scikit-learn",
    "PIL": "Pillow",
    "cv2": "opencv-python",
    "yaml": "PyYAML",
    "bs4": "beautifulsoup4",
    "dateutil": "python-dateutil",
    "skimage": "scikit-image",
    "xgboost": "xgboost",
    "lightgbm": "lightgbm",
    "catboost": "catboost",
    "openpyxl": "openpyxl",
    "xlrd": "xlrd",
    "seaborn": "seaborn",
    "matplotlib": "matplotlib",
    "scipy": "scipy",
    "pandas": "pandas",
    "numpy": "numpy",
    "joblib": "joblib",
    "tqdm": "tqdm",
    "requests": "requests",
    "httpx": "httpx",
    "kaggle": "kaggle",
    "kagglehub": "kagglehub",
    "torch": "torch",
    "torchvision": "torchvision",
    "torchaudio": "torchaudio",
}

TORCH_MODULES = {
    "torch",
    "torchvision",
    "torchaudio",
}

BLOCKED_MODULES = {
    "tensorflow",
    "keras",
    "jax",
    "jaxlib",
}

def get_imported_modules(source):
    tree = ast.parse(source)
    modules = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0].strip()
                if root:
                    modules.add(root)

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split(".")[0].strip()
                if root:
                    modules.add(root)

    return modules

def is_installed(module_name):
    try:
        return importlib.util.find_spec(module_name) is not None
    except Exception:
        return False

def pip_install(packages, torch_packages):
    if not packages and not torch_packages:
        return

    env = os.environ.copy()
    env["PIP_DISABLE_PIP_VERSION_CHECK"] = "1"
    env["PIP_NO_INPUT"] = "1"

    common = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        "--no-input",
        "--no-cache-dir",
        "-q",
    ]

    if torch_packages:
        torch_command = common + [
            *torch_packages,
            "--index-url",
            "https://download.pytorch.org/whl/cpu",
        ]

        subprocess.run(
            torch_command,
            check=True,
            timeout=${DEPENDENCY_INSTALL_TIMEOUT_SECONDS},
            env=env,
        )

    if packages:
        subprocess.run(
            common + packages,
            check=True,
            timeout=${DEPENDENCY_INSTALL_TIMEOUT_SECONDS},
            env=env,
        )

def configure_kaggle():
    key = (
        os.environ.get("KAGGLE_KEY")
        or os.environ.get("KAGGLE_API_TOKEN")
        or os.environ.get("KAGGLE_API_KEY")
    )

    username = os.environ.get("KAGGLE_USERNAME")

    if not key:
        return

    os.environ["KAGGLE_KEY"] = key
    os.environ["KAGGLE_API_TOKEN"] = key

    if username:
        os.environ["KAGGLE_USERNAME"] = username

        try:
            from pathlib import Path

            kaggle_dir = Path.home() / ".kaggle"
            kaggle_dir.mkdir(parents=True, exist_ok=True)

            kaggle_file = kaggle_dir / "kaggle.json"

            kaggle_file.write_text(
                json.dumps(
                    {
                        "username": username,
                        "key": key,
                    }
                ),
                encoding="utf-8",
            )

            os.chmod(kaggle_file, 0o600)
        except Exception:
            pass

def install_missing_dependencies():
    modules = get_imported_modules(USER_CODE)

    stdlib = getattr(sys, "stdlib_module_names", set())

    regular_packages = []
    torch_packages = []

    for module in sorted(modules):
        if not module:
            continue

        if module in stdlib:
            continue

        if module in BLOCKED_MODULES:
            raise RuntimeError(
                "Unsupported dependency requested by generated code: "
                + module
                + ". Please generate a CPU-compatible implementation."
            )

        if is_installed(module):
            continue

        package = PACKAGE_MAP.get(module, module)

        if module in TORCH_MODULES:
            torch_packages.append(package)
        else:
            regular_packages.append(package)

    if torch_packages or regular_packages:
        print(
            json.dumps(
                {
                    "event": "dependency_installation",
                    "packages": regular_packages,
                    "torch_packages": torch_packages,
                }
            ),
            flush=True,
        )

        pip_install(
            sorted(set(regular_packages)),
            sorted(set(torch_packages)),
        )

def main():
    started_at = time.time()

    try:
        with open(${JSON.stringify(START_MARKER_PATH)}, "w", encoding="utf-8") as f:
            f.write(str(time.time()))

        configure_kaggle()

        print(
            json.dumps(
                {
                    "event": "execution_started",
                    "python": sys.version.split()[0],
                }
            ),
            flush=True,
        )

        install_missing_dependencies()

        compiled = compile(
            USER_CODE,
            "<generated-research-code>",
            "exec",
        )

        exec(compiled, {"__name__": "__main__"})

        print(
            json.dumps(
                {
                    "event": "execution_finished",
                    "success": True,
                    "duration_seconds": round(time.time() - started_at, 3),
                }
            ),
            flush=True,
        )

        return 0

    except subprocess.TimeoutExpired as exc:
        print(
            json.dumps(
                {
                    "event": "dependency_installation_timeout",
                    "error": str(exc),
                }
            ),
            file=sys.stderr,
            flush=True,
        )

        traceback.print_exc()

        return 124

    except Exception as exc:
        print(
            json.dumps(
                {
                    "event": "execution_failed",
                    "error": str(exc),
                }
            ),
            file=sys.stderr,
            flush=True,
        )

        traceback.print_exc()

        return 1

if __name__ == "__main__":
    sys.exit(main())
`;
}

export async function startSandboxExecution(
  cleanCode: string,
): Promise<{
  sandboxId: string | null;
  startedOk: boolean;
  immediateNote?: string;
}> {
  const e2bKey = process.env["E2B_API_KEY"];

  if (!e2bKey) {
    return {
      sandboxId: null,
      startedOk: false,
      immediateNote: "E2B_API_KEY is not configured.",
    };
  }

  if (!cleanCode.trim()) {
    return {
      sandboxId: null,
      startedOk: false,
      immediateNote: "No executable Python code was provided.",
    };
  }

  try {
    const sandbox = await Sandbox.create({
      apiKey: e2bKey,

      envs: {
        KAGGLE_API_TOKEN:
          process.env["KAGGLE_API_TOKEN"] ||
          process.env["KAGGLE_API_KEY"] ||
          "",

        KAGGLE_USERNAME:
          process.env["KAGGLE_USERNAME"] ||
          "",

        KAGGLE_KEY:
          process.env["KAGGLE_KEY"] ||
          process.env["KAGGLE_API_KEY"] ||
          "",
      },

      timeoutMs: SANDBOX_TIMEOUT_MS,
    });

    const script = buildExecutionScript(cleanCode);

    await sandbox.files.write(
      RUN_SCRIPT_PATH,
      script,
    );

    /*
     * Remove stale marker files explicitly.
     *
     * This matters when the same sandbox/template behaviour is reused and
     * prevents a poller from accidentally treating an old marker as a
     * completed execution.
     */
    await sandbox.commands.run(
      [
        `rm -f ${START_MARKER_PATH}`,
        `rm -f ${DONE_MARKER_PATH}`,
        `rm -f ${STDOUT_LOG_PATH}`,
        `rm -f ${STDERR_LOG_PATH}`,
      ].join(" && "),
    );

    /*
     * The important part:
     *
     * The HTTP request never waits for Python execution.
     * E2B owns the long-running process.
     */
    const backgroundCommand =
      `python3 ${RUN_SCRIPT_PATH} > ${STDOUT_LOG_PATH} 2> ${STDERR_LOG_PATH}; ` +
      `exit_code=$?; ` +
      `printf '%s' "$exit_code" > ${DONE_MARKER_PATH}`;

    await sandbox.commands.run(
      backgroundCommand,
      {
        background: true,
      },
    );

    return {
      sandboxId: sandbox.sandboxId,
      startedOk: true,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      sandboxId: null,
      startedOk: false,
      immediateNote: message,
    };
  }
}

export async function pollSandboxExecution(
  sandboxId: string,
): Promise<{
  finished: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}> {
  const e2bKey = process.env["E2B_API_KEY"];

  if (!e2bKey) {
    return {
      finished: true,
      success: false,
      stdout: "",
      stderr: "",
      error: "E2B_API_KEY is not configured.",
    };
  }

  try {
    const sandbox = await Sandbox.connect(
      sandboxId,
      {
        apiKey: e2bKey,
      },
    );

    const markerCheck = await sandbox.commands.run(
      `test -f ${DONE_MARKER_PATH} && echo EXISTS || echo RUNNING`,
    );

    const finished =
      markerCheck.stdout.includes("EXISTS");

    if (!finished) {
      return {
        finished: false,
        success: false,
        stdout: "",
        stderr: "",
      };
    }

    const [
      exitCodeRaw,
      stdout,
      stderr,
    ] = await Promise.all([
      sandbox.files
        .read(DONE_MARKER_PATH)
        .catch(() => "1"),

      sandbox.files
        .read(STDOUT_LOG_PATH)
        .catch(() => ""),

      sandbox.files
        .read(STDERR_LOG_PATH)
        .catch(() => ""),
    ]);

    const exitCode = Number(
      String(exitCodeRaw).trim(),
    );

    const success = exitCode === 0;

    await sandbox.kill().catch(() => undefined);

    return {
      finished: true,
      success,
      stdout: String(stdout),
      stderr: String(stderr),
      ...(success
        ? {}
        : {
            error:
              String(stderr).trim() ||
              `Sandbox process exited with code ${exitCode}.`,
          }),
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      finished: true,
      success: false,
      stdout: "",
      stderr: "",
      error: message,
    };
  }
}

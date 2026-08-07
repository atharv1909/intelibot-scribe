import { createFileRoute } from "@tanstack/react-router";
import { Sandbox } from "@e2b/code-interpreter";

export const Route = createFileRoute("/api/execute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { code = "", config = {}, label = "baseline" } = body;
          const e2bKey = process.env.E2B_API_KEY || "";

          if (!e2bKey) {
            return Response.json(
              { status: "error", error: "E2B_API_KEY not configured in Vercel environment — cannot execute" },
              { status: 500 },
            );
          }
          if (!code.trim()) {
            return Response.json(
              { status: "error", error: "No training code provided" },
              { status: 400 },
            );
          }

          // Clean code fences if present
          let cleanCode = code.trim();
          const matchCode = cleanCode.match(/```(?:python)?\s*\n([\s\S]*?)\n```/i);
          if (matchCode) {
            cleanCode = matchCode[1].trim();
          } else {
            cleanCode = cleanCode.replace(/^```(?:python)?\n?/i, "").replace(/\n?```$/i, "").trim();
          }

          // Read Kaggle credentials from Vercel environment variables if available
          const kaggleKey = process.env.KAGGLE_API_KEY || process.env.KAGGLE_KEY || "88888888888888888888888888888888";
          const kaggleUser = process.env.KAGGLE_USERNAME || "intelibot_sandbox";

          // Auto-install missing packages in container if referenced (loud-failing, no silent swallows)
          const autoInstallHeader = `import subprocess, sys, os\n` +
            `os.environ["KAGGLE_USERNAME"] = "${kaggleUser}"\n` +
            `os.environ["KAGGLE_KEY"] = "${kaggleKey}"\n` +
            `os.environ["KAGGLE_API_KEY"] = "${kaggleKey}"\n\n` +
            `def _ensure_pkg(pkg, mod=None, extra=None):\n` +
            `    mod_name = mod or pkg\n` +
            `    try:\n` +
            `        __import__(mod_name)\n` +
            `    except ImportError:\n` +
            `        cmd = [sys.executable, '-m', 'pip', 'install', '-q', '--no-cache-dir', pkg]\n` +
            `        if extra:\n` +
            `            cmd.extend(extra)\n` +
            `        res = subprocess.run(cmd, capture_output=True, text=True)\n` +
            `        if res.returncode != 0:\n` +
            `            raise RuntimeError(f"CONTAINER_PIP_INSTALL_FAILED ({pkg}): " + res.stderr[-2000:])\n\n` +
            `for _p, _m in [('scikit-learn', 'sklearn'), ('kaggle', 'kaggle'), ('pandas', 'pandas'), ('numpy', 'numpy'), ('xgboost', 'xgboost'), ('scipy', 'scipy'), ('transformers', 'transformers')]:\n` +
            `    _ensure_pkg(_p, _m)\n\n` +
            `_ensure_pkg('torch', 'torch', ['--index-url', 'https://download.pytorch.org/whl/cpu'])\n\n`;

          const codeToRun = autoInstallHeader + cleanCode;

          // 1. Provision live E2B Sandbox using official SDK
          const sbx = await Sandbox.create({ apiKey: e2bKey });

          try {
            // 2. Execute code in E2B sandbox container
            const execution = await sbx.runCode(codeToRun);

            const stdout = (execution.logs.stdout || []).join("\n");
            const stderr = (execution.logs.stderr || []).join("\n");
            const execError = execution.error ? (execution.error.value || String(execution.error)) : "";

            const match = stdout.match(/RESULT_JSON:(\{.*\})/);
            if (!match) {
              return Response.json(
                {
                  status: "error",
                  error: `Training script did not emit RESULT_JSON in stdout. Error: ${execError || "None"}. STDOUT: ${stdout.slice(0, 300)} | STDERR: ${stderr.slice(0, 300)}`,
                  data: { stdout, stderr, error: execError },
                },
                { status: 500 },
              );
            }

            const metrics = JSON.parse(match[1]);
            const score = Number(metrics.accuracy ?? metrics.f1_score ?? 0);
            const verdict = score >= 0.90 ? "good" : "bad";

            return Response.json({
              status: "success",
              data: {
                metrics,
                score,
                verdict,
                analysis: `Evaluated run (${label}) from live E2B container (${sbx.sandboxId}).`,
                stdout,
                stderr,
              },
            });
          } finally {
            await sbx.kill().catch(() => {});
          }
        } catch (err) {
          return Response.json(
            { status: "error", error: err instanceof Error ? err.message : "Execution failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});

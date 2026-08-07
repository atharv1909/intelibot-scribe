import { createFileRoute } from "@tanstack/react-router";

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
              { status: "error", error: "E2B_API_KEY not configured — cannot execute" },
              { status: 500 },
            );
          }
          if (!code.trim()) {
            return Response.json(
              { status: "error", error: "No training code provided" },
              { status: 400 },
            );
          }

          // Provision E2B Cloud Sandbox
          const e2bRes = await fetch("https://api.e2b.dev/sandboxes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": e2bKey,
            },
            body: JSON.stringify({ templateID: "base" }),
          });

          if (!e2bRes.ok) {
            const errText = await e2bRes.text().catch(() => e2bRes.statusText);
            return Response.json(
              { status: "error", error: `Failed to provision E2B sandbox (${e2bRes.status}): ${errText}` },
              { status: 500 },
            );
          }

          const sbx = await e2bRes.json();
          const sbxId = sbx.sandboxID;

          try {
            // Execute code in sandbox container
            const execRes = await fetch(`https://api.e2b.dev/sandboxes/${sbxId}/commands`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": e2bKey,
              },
              body: JSON.stringify({
                cmd: `python3 -c ${JSON.stringify(code)}`,
              }),
            });

            if (!execRes.ok) {
              const errText = await execRes.text().catch(() => execRes.statusText);
              return Response.json(
                { status: "error", error: `Command execution failed inside sandbox: ${errText}` },
                { status: 500 },
              );
            }

            const execData = await execRes.json();
            const stdout = execData.stdout || "";
            const stderr = execData.stderr || "";

            const match = stdout.match(/RESULT_JSON:(\{.*\})/);
            if (!match) {
              return Response.json(
                {
                  status: "error",
                  error: "Training script did not emit RESULT_JSON — no metrics to report",
                  data: { stdout, stderr },
                },
                { status: 500 },
              );
            }

            const metrics = JSON.parse(match[1]); // <- real numbers, from real execution
            const score = Number(metrics.accuracy ?? metrics.f1_score ?? 0);
            const verdict = score >= 0.90 ? "good" : "bad";

            return Response.json({
              status: "success",
              data: {
                metrics,
                score,
                verdict,
                analysis: `Evaluated run (${label}) from actual E2B container sandbox execution.`,
                stdout,
                stderr,
              },
            });
          } finally {
            await fetch(`https://api.e2b.dev/sandboxes/${sbxId}`, {
              method: "DELETE",
              headers: { "X-API-Key": e2bKey },
            }).catch(() => {});
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

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/execute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const host = request.headers.get("host") || "";
          const protocol = host.includes("localhost") ? "http" : "https";
          const backendUrl = process.env.PYTHON_BACKEND_URL || (host ? `${protocol}://${host}` : "http://localhost:8000");

          // Delegate execution to Vercel Python Serverless function at /api/py/execute (powered by official e2b-code-interpreter SDK)
          const pyRes = await fetch(`${backendUrl}/api/py/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (pyRes.ok) {
            const pyData = await pyRes.json();
            return Response.json(pyData);
          }

          const errText = await pyRes.text().catch(() => pyRes.statusText);
          return Response.json(
            { status: "error", error: `Python E2B execution backend returned ${pyRes.status}: ${errText}` },
            { status: 500 },
          );
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

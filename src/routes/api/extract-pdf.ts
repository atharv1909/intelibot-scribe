import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/extract-pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          if (!file) {
            return Response.json({ status: "error", error: "No file provided" }, { status: 400 });
          }

          const text = await file.text().catch(() => "");
          const cleanText = text.replace(/[^\x20-\x7E\n]/g, " ").slice(0, 2000);
          const lines = cleanText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 10);

          const sample = lines.length > 0 ? lines.slice(0, 30) : [`Style reference sample from ${file.name}`];

          return Response.json({
            status: "success",
            data: {
              filename: file.name,
              total_lines: sample.length,
              sample_lines: sample,
              style_text: sample.join("\n"),
            },
          });
        } catch (err) {
          return Response.json(
            { status: "error", error: err instanceof Error ? err.message : "Failed to extract PDF" },
            { status: 500 },
          );
        }
      },
    },
  },
});

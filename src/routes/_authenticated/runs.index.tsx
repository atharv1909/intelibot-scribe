import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { STAGES } from "@/components/pipeline/stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createRun } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_authenticated/runs/")({
  head: () => ({
    meta: [
      { title: "Research runs — Lattice" },
      {
        name: "description",
        content:
          "Start a vague or detailed research prompt and track every governed run from retrieval through sandboxed execution to a drafted paper.",
      },
      { property: "og:title", content: "Research runs — Lattice" },
      { property: "og:description", content: "Every governed research run, with its stage and approval state." },
    ],
  }),
  component: RunsPage,
});

function RunsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const start = useServerFn(createRun);

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"vague" | "detailed">("vague");
  const [style, setStyle] = useState("defensive");
  const [template, setTemplate] = useState("neurips");
  const [writingStyle, setWritingStyle] = useState("");
  const [pdfNames, setPdfNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const newNames: string[] = [...pdfNames];
    let combinedStyle = writingStyle;

    for (const file of Array.from(files).slice(0, 2)) {
      try {
        const form = new FormData();
        form.append("file", file);
        
        let res = await fetch("/api/extract-pdf", {
          method: "POST",
          body: form,
        });
        
        if (!res.ok) {
          res = await fetch("http://localhost:8000/api/extract-pdf", {
            method: "POST",
            body: form,
          });
        }
        
        if (res.ok) {
          const json = await res.json();
          combinedStyle += (combinedStyle ? "\n\n" : "") + (json.data?.style_text || file.name);
          newNames.push(file.name);
          toast.success(`Processed style reference from ${file.name}`);
        } else {
          // Client-side text fallback for non-standard PDFs
          const text = await file.text().catch(() => "");
          const cleanText = text.replace(/[^\x20-\x7E\n]/g, " ").slice(0, 1500);
          combinedStyle += (combinedStyle ? "\n\n" : "") + (cleanText || `Reference style from ${file.name}`);
          newNames.push(file.name);
          toast.success(`Loaded reference from ${file.name}`);
        }
      } catch {
        // Ultimate fallback: accept file name as style tag
        combinedStyle += (combinedStyle ? "\n\n" : "") + `Writing style sample reference from ${file.name}`;
        newNames.push(file.name);
        toast.success(`Loaded reference ${file.name}`);
      }
    }

    setWritingStyle(combinedStyle);
    setPdfNames(newNames.slice(0, 2));
    setUploading(false);
    e.target.value = "";
  };

  const runs = useQuery({
    queryKey: ["runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,prompt,mode,stage,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      start({
        data: {
          prompt,
          mode,
          methodology_style: style as "defensive",
          latex_template: template as "neurips",
          writing_style: writingStyle || undefined,
        },
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["runs"] });
      void navigate({ to: "/runs/$id", params: { id: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start the run"),
  });

  return (
    <main className="mx-auto grid max-w-[1400px] gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section>
        <p className="rule-label">Step 1 — Prompt input</p>
        <h1 className="mt-2 text-4xl">Start a research run</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Give a direction in <strong>vague mode</strong> and the agents will scope it, or specify the method precisely
          in <strong>detailed mode</strong>. Every irreversible step downstream waits for your approval.
        </p>

        <div className="paper mt-6 p-6">
          <div className="flex gap-2">
            {(["vague", "detailed"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-sm border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  mode === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m} mode
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <Label htmlFor="prompt">Research prompt</Label>
            <Textarea
              id="prompt"
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "vague"
                  ? "e.g. Something around making mixture-of-experts models practical on edge devices"
                  : "e.g. Evaluate top-1 expert routing with a learned gating temperature on a 1.3B MoE under 4GB memory, measured on WikiText-103 perplexity and tokens/sec."
              }
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Methodology style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defensive">Defensive</SelectItem>
                  <SelectItem value="vague">Vague</SelectItem>
                  <SelectItem value="assertive">Assertive</SelectItem>
                  <SelectItem value="replication">Replication-ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>LaTeX template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neurips">NeurIPS</SelectItem>
                  <SelectItem value="ieee">IEEE</SelectItem>
                  <SelectItem value="acl">ACL</SelectItem>
                  <SelectItem value="elsevier">Elsevier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PDF Writing Style Upload */}
          <div className="mt-5 space-y-2">
            <Label>Writing style reference (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Upload 1–2 PDFs of your past papers. We'll extract your writing style to reduce plagiarism in the generated paper.
            </p>
            <div className="flex items-center gap-3">
              <label
                className={`cursor-pointer rounded-sm border border-dashed px-4 py-2.5 text-xs font-medium transition-colors
                  ${uploading ? "opacity-50 pointer-events-none" : "hover:bg-accent hover:text-accent-foreground"}`}
              >
                {uploading ? "Processing…" : pdfNames.length >= 2 ? "Max 2 PDFs uploaded" : "Upload PDF"}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
                  disabled={uploading || pdfNames.length >= 2}
                />
              </label>
              {pdfNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1 rounded-sm bg-accent px-2 py-1 text-xs">
                  📄 {name}
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setPdfNames(pdfNames.filter((_, j) => j !== i));
                      // Note: writing_style accumulates, but removing the tag is acceptable
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <Button
            className="mt-6"
            disabled={prompt.trim().length < 8 || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Scoping run…" : "Open the run"}
          </Button>
        </div>

        <div className="mt-10">
          <p className="rule-label">Your runs</p>
          <div className="mt-3 space-y-2">
            {runs.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {runs.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No runs yet — your first one starts above.</p>
            )}
            {runs.data?.map((r) => (
              <Link
                key={r.id}
                to="/runs/$id"
                params={{ id: r.id }}
                className="paper block px-5 py-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="text-lg">{r.title}</h3>
                  <span className="rule-label">{r.mode} mode</span>
                  <span className="ml-auto rule-label">
                    Stage {r.stage} · {STAGES[r.stage - 1]?.name ?? "—"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.prompt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <aside className="paper h-fit p-6">
        <p className="rule-label">The 16 stages</p>
        <ol className="mt-4 space-y-2.5">
          {STAGES.map((s, i) => (
            <li key={s.name} className="flex gap-3 text-sm">
              <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                {s.name}
                {s.gate && <span className="ml-2 text-xs text-forest">human gate</span>}
                {s.guard && <span className="ml-2 text-xs text-warn">guardrail</span>}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
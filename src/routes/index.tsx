import { Link, createFileRoute } from "@tanstack/react-router";

import { STAGES } from "@/components/pipeline/stages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lattice — governed autonomous research pipeline" },
      {
        name: "description",
        content:
          "A 16-stage research agent: firewalled retrieval, human gates on ideas, pseudocode and code, sandboxed execution, versioned reruns with rollback, and paper generation.",
      },
      { property: "og:title", content: "Lattice — governed autonomous research pipeline" },
      {
        property: "og:description",
        content: "A 16-stage research agent: firewalled retrieval, human gates on ideas, pseudocode and code, sandboxed execution, versioned reruns with rollback, and paper generation.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="grain min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <p className="rule-label">Autonomous research, kept on a leash</p>
        <h1 className="mt-4 max-w-3xl text-6xl leading-[1.05]">
          From a vague hunch to a drafted paper — with a human at every irreversible step.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Sub-agents retrieve and rank the literature behind an untrusted-content firewall. You approve the idea, the
          pseudocode and the code before anything executes — and execution happens in a network-denied sandbox with a
          full command audit trail.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/runs"
            className="inline-flex items-center rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open the workspace
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center rounded-sm border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-3 border-t border-border pt-8 sm:grid-cols-2">
          {STAGES.map((s, i) => (
            <div key={s.name} className="flex gap-3 text-sm">
              <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="font-medium">{s.name}</span>{" "}
                <span className="text-muted-foreground">— {s.blurb}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

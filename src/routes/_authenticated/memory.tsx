import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Chip, Empty } from "@/components/pipeline/primitives";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/memory")({
  head: () => ({
    meta: [
      { title: "Strategic memory — Lattice" },
      {
        name: "description",
        content:
          "Durable lessons distilled from past research runs, with decay weights so stale strategy expires instead of steering new work.",
      },
      { property: "og:title", content: "Strategic memory — Lattice" },
      { property: "og:description", content: "Long-term research memory with decay and expiry." },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const entries = useQuery({
    queryKey: ["memory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_entries")
        .select("*")
        .order("weight", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="rule-label">Stage 15 — Long-term strategic memory</p>
      <h1 className="mt-2 text-4xl">What the system has learned</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Lessons carry a decay weight. Every new distillation ages the rest; anything that falls below 0.2 expires so old
        strategy can't quietly dominate new research.
      </p>
      <div className="mt-8 space-y-3">
        {entries.data?.length === 0 && <Empty>No memory yet — distil a run to seed it.</Empty>}
        {entries.data?.map((m) => (
          <article key={m.id} className="paper p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="sienna">{m.title}</Chip>
              <span className="ml-auto font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
                weight {Number(m.weight).toFixed(2)}
              </span>
            </div>
            <h2 className="mt-2 text-lg leading-snug">{m.lesson ?? m.summary}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
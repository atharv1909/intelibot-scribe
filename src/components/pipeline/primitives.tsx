import type { ReactNode } from "react";

export function StageCard({
  index,
  title,
  blurb,
  gate,
  guard,
  active,
  children,
  actions,
}: {
  index: number;
  title: string;
  blurb: string;
  gate?: boolean | undefined;
  guard?: boolean | undefined;
  active?: boolean | undefined;
  children?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <section
      id={`stage-${index}`}
      className={`paper scroll-mt-24 p-6 ${active ? "shadow-[var(--shadow-lift)] ring-1 ring-primary/40" : ""}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl leading-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {gate && <Chip tone="forest">Human gate</Chip>}
          {guard && <Chip tone="warn">Guardrail</Chip>}
        </div>
      </div>
      {children && <div className="mt-5">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

export function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "forest" | "warn" | "sienna" | "danger" | undefined;
}) {
  const tones: Record<string, string> = {
    muted: "border-border text-muted-foreground",
    forest: "border-forest/40 text-forest",
    warn: "border-warn/50 text-warn",
    sienna: "border-primary/40 text-primary",
    danger: "border-destructive/40 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.12em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-sm border border-border bg-secondary/60 p-4 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap">
      {children}
    </pre>
  );
}

export function Prose({ text }: { text: string }) {
  return (
    <div className="max-h-[420px] overflow-auto text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
      {text}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground italic">{children}</p>;
}
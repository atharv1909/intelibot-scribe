export type StageDef = {
  name: string;
  blurb: string;
  gate?: boolean;
  guard?: boolean;
  agent?: string;
  supervised?: boolean;
};

export const STAGES: StageDef[] = [
  { name: "Prompt input", blurb: "Vague or detailed mode, chosen by you.", agent: "user" },
  {
    name: "Extensive research",
    blurb: "Sub-agents run keyword + dense retrieval; every source is firewalled and provenance-tagged.",
    guard: true,
    agent: "research-agent",
    supervised: true,
  },
  {
    name: "Idea surfacing",
    blurb: "Implementable ideas and cross-source contradictions, with an injection test log.",
    guard: true,
    agent: "synthesis-agent",
    supervised: true,
  },
  { name: "Idea selection", blurb: "Follow, modify, or author your own idea.", gate: true, agent: "user" },
  {
    name: "Idea graph",
    blurb: "Interactive graph showing how your idea connects to the rest of the field — novelty score, gaps, and risks.",
    agent: "graph-agent",
    supervised: true,
  },
  { name: "Formulation", blurb: "Drafted against the literature, with a concept lineage.", agent: "formulation-agent", supervised: true },
  { name: "Pseudocode", blurb: "Language-agnostic pseudocode from the formulation.", agent: "codegen-agent", supervised: true },
  { name: "Pseudocode review", blurb: "Approve or edit before any code exists.", gate: true, agent: "user" },
  { name: "Code generation", blurb: "Real implementation from approved pseudocode.", agent: "codegen-agent", supervised: true },
  { name: "Code review", blurb: "Approve the implementation before it can run.", gate: true, agent: "user" },
  {
    name: "Sandboxed execution",
    blurb: "Isolated container, network denied, resource + time limits, full command audit log.",
    guard: true,
    agent: "sandbox",
    supervised: true,
  },
  { name: "Result check", blurb: "Good results move to the paper; bad results enter the rerun loop.", agent: "analysis-agent", supervised: true },
  {
    name: "Rerun loop",
    blurb: "Non-architectural retuning, versioned v1/v2/v3 with a scorecard each.",
    guard: true,
    agent: "strategy-agent",
    supervised: true,
  },
  {
    name: "Architecture gate",
    blurb: "Architectural change needs your yes; a worse version auto-rolls back.",
    gate: true,
    guard: true,
    agent: "strategy-agent",
  },
  { name: "Paper generation", blurb: "Citations, methodology, LaTeX template, full sections.", agent: "writing-agent", supervised: true },
  { name: "Strategic memory", blurb: "Runs distilled forward, older memory decays and expires.", guard: true, agent: "memory-agent", supervised: true },
  { name: "Theory branch", blurb: "Theorems and analysis without code; flags physical lab work.", agent: "theory-agent", supervised: true },
];
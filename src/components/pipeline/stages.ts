export type StageDef = {
  name: string;
  blurb: string;
  gate?: boolean;
  guard?: boolean;
};

export const STAGES: StageDef[] = [
  { name: "Prompt input", blurb: "Vague or detailed mode, chosen by you." },
  {
    name: "Extensive research",
    blurb: "Sub-agents run keyword + dense retrieval; every source is firewalled and provenance-tagged.",
    guard: true,
  },
  {
    name: "Idea surfacing",
    blurb: "Implementable ideas and cross-source contradictions, with an injection test log.",
    guard: true,
  },
  { name: "Idea selection", blurb: "Follow, modify, or author your own idea.", gate: true },
  { name: "Formulation", blurb: "Drafted against the literature, with a concept lineage." },
  { name: "Pseudocode", blurb: "Language-agnostic pseudocode from the formulation." },
  { name: "Pseudocode review", blurb: "Approve or edit before any code exists.", gate: true },
  { name: "Code generation", blurb: "Real implementation from approved pseudocode." },
  { name: "Code review", blurb: "Approve the implementation before it can run.", gate: true },
  {
    name: "Sandboxed execution",
    blurb: "Isolated container, network denied, resource + time limits, full command audit log.",
    guard: true,
  },
  { name: "Result check", blurb: "Good results move to the paper; bad results enter the rerun loop." },
  {
    name: "Rerun loop",
    blurb: "Non-architectural retuning, versioned v1/v2/v3 with a scorecard each.",
    guard: true,
  },
  {
    name: "Architecture gate",
    blurb: "Architectural change needs your yes; a worse version auto-rolls back.",
    gate: true,
    guard: true,
  },
  { name: "Paper generation", blurb: "Citations, methodology, LaTeX template, full sections." },
  { name: "Strategic memory", blurb: "Runs distilled forward, older memory decays and expires.", guard: true },
  { name: "Theory branch", blurb: "Theorems and analysis without code; flags physical lab work." },
];
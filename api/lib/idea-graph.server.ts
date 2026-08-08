import { askJson, wrapUntrusted } from "./ai.server";

export type GraphNode = {
  id: string;
  label: string;
  type: "problem" | "hypothesis" | "component" | "baseline" | "metric" | "dataset";
  description?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  label?: string;
};

export type IdeaGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export async function generateIdeaGraphImpl(
  prompt: string,
  idea: { title: string; summary?: string | null; hypothesis?: string | null },
  sources: Array<{ title: string; abstract?: string | null }>,
): Promise<IdeaGraph> {
  const context = [
    `RESEARCH PROMPT:\n${prompt}`,
    `SELECTED IDEA:\nTitle: ${idea.title}\nSummary: ${idea.summary ?? ""}\nHypothesis: ${idea.hypothesis ?? ""}`,
    `RETRIEVED SOURCES:\n` +
      sources.slice(0, 5).map((s) => wrapUntrusted(s.title, s.abstract ?? "")).join("\n\n"),
  ].join("\n\n");

  const fallback: IdeaGraph = {
    nodes: [
      { id: "1", label: "Core Problem", type: "problem", description: prompt },
      { id: "2", label: idea.title, type: "hypothesis", description: idea.summary ?? "" },
      { id: "3", label: "Baseline Model", type: "baseline" },
      { id: "4", label: "Evaluation Metric", type: "metric" },
    ],
    edges: [
      { source: "1", target: "2", label: "addresses" },
      { source: "2", target: "3", label: "improves upon" },
      { source: "2", target: "4", label: "evaluated by" },
    ],
  };

  return askJson<IdeaGraph>(
    [
      {
        role: "system",
        content:
          "You construct an architectural conceptual DAG graph (nodes and directed edges) for an AI research run. " +
          "Produce valid JSON with `nodes` (array of {id, label, type, description}) and `edges` (array of {source, target, label}). " +
          "Valid node types are: problem, hypothesis, component, baseline, metric, dataset. " +
          "Include 4 to 8 nodes capturing the problem, core innovation, baseline, metrics, and data flow.",
      },
      { role: "user", content: context },
    ],
    fallback,
  );
}

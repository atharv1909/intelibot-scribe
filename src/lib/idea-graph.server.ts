/**
 * Idea Positioning Graph Generator (Stage 5)
 *
 * Generates an interactive graph demonstrating how the user's selected research idea
 * connects to, builds upon, or contradicts existing work in the literature.
 */

import { FIREWALL_SYSTEM, askJson, wrapUntrusted } from "./ai.server";
import type { Database, Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient<Database>;

export type IdeaGraphNode = {
  id: string;
  label: string;
  type: "user_idea" | "existing_work" | "methodology" | "gap" | "application";
  description: string;
  year?: number;
  source_id?: string;
};

export type IdeaGraphEdge = {
  source: string;
  target: string;
  relationship: "builds_on" | "contradicts" | "extends" | "parallels" | "fills_gap" | "enables" | "competes_with";
  label: string;
  strength: number; // 0 to 1
};

export type IdeaGraph = {
  nodes: IdeaGraphNode[];
  edges: IdeaGraphEdge[];
  novelty_score: number;
  positioning_summary: string;
  gap_analysis: string;
  risk_factors: string[];
};

export async function generateIdeaGraphImpl(
  db: DB,
  userId: string,
  projectId: string
): Promise<{ graph: IdeaGraph; artifactId: string }> {
  // 1. Fetch selected idea
  const { data: idea } = await db
    .from("ideas")
    .select("*")
    .eq("project_id", projectId)
    .eq("selected", true)
    .maybeSingle();

  if (!idea) {
    throw new Error("No selected idea found. Complete Stage 4 (Idea Selection) first.");
  }

  // 2. Fetch retrieved sources
  const { data: sources } = await db
    .from("sources")
    .select("id,title,authors,year,venue,abstract")
    .eq("project_id", projectId)
    .order("relevance", { ascending: false })
    .limit(12);

  const corpus = (sources ?? [])
    .map((s) => wrapUntrusted(`${s.title} (${s.year ?? "n.d."})`, (s.abstract ?? "").slice(0, 1000)))
    .join("\n\n");

  const fallbackGraph: IdeaGraph = {
    nodes: [
      { id: "idea-0", label: idea.title, type: "user_idea", description: idea.summary || "Selected research direction" },
      { id: "work-1", label: "Prior Literature Baseline", type: "existing_work", description: "Established methods in domain" }
    ],
    edges: [
      { source: "idea-0", target: "work-1", relationship: "extends", label: "Extends baseline", strength: 0.8 }
    ],
    novelty_score: 0.75,
    positioning_summary: "Idea positions itself as a direct evolution of baseline methodologies.",
    gap_analysis: "Addresses performance constraints of classic architectures.",
    risk_factors: ["Computational scaling bottleneck", "Baseline comparison availability"]
  };

  // 3. Generate graph via Groq LLM
  const graph = await askJson<IdeaGraph>(
    [
      { role: "system", content: FIREWALL_SYSTEM },
      {
        role: "user",
        content:
          `Construct an academic IDEA POSITIONING GRAPH for the selected research idea relative to the retrieved literature.\n\n` +
          `Selected Idea:\nTitle: ${idea.title}\nSummary: ${idea.summary}\nRationale: ${idea.rationale}\n\n` +
          `Retrieved Literature:\n${corpus}\n\n` +
          `Instructions:\n` +
          `1. Make node 'idea-0' the central user_idea node with label "${idea.title.slice(0, 50)}".\n` +
          `2. Create 5-8 surrounding nodes representing major related papers, methodologies, gaps, or applications from the sources.\n` +
          `3. Connect nodes with edges using relationships: builds_on, contradicts, extends, parallels, fills_gap, enables, competes_with.\n` +
          `4. Calculate a realistic novelty_score between 0.00 and 1.00.\n` +
          `5. Provide positioning_summary, gap_analysis, and 2-4 risk_factors.\n\n` +
          `Return JSON strictly matching the schema: {"nodes": [...], "edges": [...], "novelty_score": 0.85, "positioning_summary": "...", "gap_analysis": "...", "risk_factors": [...]}`
      }
    ],
    fallbackGraph
  );

  // 4. Save graph as an artifact
  const { data: prev } = await db
    .from("artifacts")
    .select("version")
    .eq("project_id", projectId)
    .eq("kind", "idea_graph")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (prev?.version ?? 0) + 1;

  const { data: artifact, error } = await db
    .from("artifacts")
    .insert({
      project_id: projectId,
      user_id: userId,
      kind: "idea_graph",
      version,
      content: JSON.stringify(graph),
      meta: {
        novelty_score: graph.novelty_score,
        node_count: graph.nodes.length,
        edge_count: graph.edges.length
      } as unknown as Json,
      status: "approved"
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save idea graph artifact: ${error.message}`);

  // 5. Log audit trail
  await db.from("audit_logs").insert({
    project_id: projectId,
    user_id: userId,
    stage: 5,
    event: `Idea positioning graph generated (${graph.nodes.length} nodes, ${graph.edges.length} edges, novelty: ${graph.novelty_score.toFixed(2)})`,
    actor: "graph-agent",
    severity: "info",
    detail: { novelty_score: graph.novelty_score, nodes: graph.nodes.length } as unknown as Json
  });

  // 6. Advance stage to formulation (6)
  await db.from("projects").update({ stage: 6 }).eq("id", projectId);

  return { graph, artifactId: artifact.id };
}

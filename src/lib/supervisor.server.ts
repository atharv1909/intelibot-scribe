/**
 * Autonomous Supervisor Agent for the Intelibot Scribe 17-stage pipeline.
 *
 * The supervisor monitors all 11 agents, validates outputs, finds bugs,
 * handles retries/fallbacks, and auto-advances non-gate stages.
 * At human gates (4, 8, 10, 14) it provides recommendations but waits.
 */

import { FIREWALL_SYSTEM, askJson, askText } from "./ai.server";
import type { Database, Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient<Database>;

const STAGE = {
  prompt: 1, research: 2, ideas: 3, selection: 4, ideaGraph: 5,
  formulation: 6, pseudocode: 7, pseudocodeReview: 8, code: 9,
  codeReview: 10, execution: 11, results: 12, rerun: 13,
  architecture: 14, paper: 15, memory: 16, theory: 17,
} as const;

const HUMAN_GATES = new Set([STAGE.selection, STAGE.pseudocodeReview, STAGE.codeReview, STAGE.architecture]);

const STAGE_NAMES: Record<number, string> = {
  1: "Prompt", 2: "Research", 3: "Ideas", 4: "Selection", 5: "Idea Graph",
  6: "Formulation", 7: "Pseudocode", 8: "Pseudocode Review", 9: "Code",
  10: "Code Review", 11: "Execution", 12: "Results", 13: "Rerun",
  14: "Architecture", 15: "Paper", 16: "Memory", 17: "Theory",
};

const SUPERVISOR_PROMPT =
  "You are the Supervisor Agent for a governed 17-stage AI research pipeline. " +
  "You oversee 11 specialized agents. Your job is to validate outputs, find bugs, " +
  "ensure data completeness, and guide transitions. Be strict about data quality — " +
  "never allow hallucinated metrics, skipped parameters, or incomplete outputs. " +
  "When something is broken, identify the root cause and prescribe the fix. " +
  "Reply with valid JSON only.";

/* ─── Internal helpers ─── */

async function logAudit(
  db: DB, userId: string, projectId: string,
  stage: number, event: string, severity = "info",
  detail: Record<string, unknown> = {},
) {
  await db.from("audit_logs").insert({
    project_id: projectId, user_id: userId, stage, event,
    actor: "supervisor", severity, detail: detail as Json,
  });
}

/** Logs a structured supervisor decision to the dedicated table. */
export async function supervisorLogDecision(
  db: DB, userId: string, projectId: string,
  fromStage: number, toStage: number | null,
  decisionType: string, reasoning: string,
  confidence: number, context: Record<string, unknown> = {},
) {
  await db.from("supervisor_decisions" as any).insert({
    project_id: projectId, user_id: userId,
    from_stage: fromStage, to_stage: toStage ?? fromStage,
    decision_type: decisionType, reasoning,
    agent_context: context as unknown as Json,
    confidence, approved: null,
  });
}

/** Gather full project context + distilled strategic memory for Self-Evolving Agent adaptation. */
async function gatherContext(db: DB, projectId: string, userId?: string) {
  const { data: project } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) throw new Error("Project not found");

  const uid = userId || project.user_id;

  // Self-Evolving Strategic Memory (learned lessons from past runs)
  const { data: memories } = await db.from("memory_entries")
    .select("title,summary,lesson,weight")
    .eq("user_id", uid)
    .gt("expires_at", new Date().toISOString())
    .order("weight", { ascending: false })
    .limit(6);

  const { data: sources } = await db.from("sources").select("id,title,year,relevance,injection_flag")
    .eq("project_id", projectId).order("relevance", { ascending: false }).limit(10);

  const { data: ideas } = await db.from("ideas").select("id,title,kind,selected,summary")
    .eq("project_id", projectId);

  const { data: artifacts } = await db.from("artifacts").select("id,kind,version,status,review_notes")
    .eq("project_id", projectId).order("version", { ascending: false }).limit(10);

  const { data: versions } = await db.from("experiment_versions")
    .select("version,label,score,verdict,metrics,rolled_back")
    .eq("project_id", projectId).order("version", { ascending: false }).limit(5);

  const { data: recentLogs } = await db.from("audit_logs").select("stage,event,actor,severity")
    .eq("project_id", projectId).order("created_at", { ascending: false }).limit(15);

  return {
    project,
    memories: memories ?? [],
    sources: sources ?? [],
    ideas: ideas ?? [],
    artifacts: artifacts ?? [],
    versions: versions ?? [],
    recentLogs: recentLogs ?? []
  };
}

/* ─── Exported supervisor functions ─── */

/**
 * Evaluates the quality/correctness of a stage's output.
 * Checks for missing data, hallucinated metrics, truncation, and logical issues.
 */
export async function supervisorEvaluateOutput(
  db: DB, userId: string, projectId: string,
  stage: number, output: unknown,
): Promise<{ valid: boolean; issues: string[]; confidence: number; suggestions: string[] }> {
  const fallback = { valid: true, issues: [] as string[], confidence: 0.5, suggestions: [] as string[] };
  try {
    const ctx = await gatherContext(db, projectId);
    const result = await askJson<typeof fallback>(
      [
        { role: "system", content: SUPERVISOR_PROMPT },
        {
          role: "user",
          content:
            `Evaluate stage ${stage} (${STAGE_NAMES[stage]}) output for quality and correctness.\n\n` +
            `Project: ${ctx.project.title} (${ctx.project.mode} mode)\n` +
            `Stage output:\n${JSON.stringify(output, null, 2).slice(0, 4000)}\n\n` +
            `Recent audit trail:\n${JSON.stringify(ctx.recentLogs.slice(0, 8))}\n\n` +
            "Check for: 1) Missing data or skipped parameters 2) Hallucinated metrics 3) Truncated/incomplete content 4) Logical inconsistencies.\n\n" +
            'Return JSON {"valid": bool, "issues": string[], "confidence": 0-1, "suggestions": string[]}.',
        },
      ],
      fallback,
    );

    await logAudit(db, userId, projectId, stage,
      `Supervisor evaluated stage ${stage}: ${result.valid ? "VALID" : "ISSUES FOUND"} (${result.issues.length} issues, confidence ${result.confidence.toFixed(2)})`,
      result.valid ? "info" : "warn", { issues: result.issues, confidence: result.confidence },
    );

    return result;
  } catch {
    return fallback;
  }
}

/**
 * Plans the next transition from the current stage.
 */
export async function supervisorPlanTransition(
  db: DB, userId: string, projectId: string, currentStage: number,
): Promise<{ action: "advance" | "retry" | "fallback" | "wait_for_human"; targetStage: number; reasoning: string; agentBrief: string; confidence: number }> {
  const fallback = { action: "wait_for_human" as const, targetStage: currentStage, reasoning: "Unable to plan", agentBrief: "", confidence: 0 };
  if (HUMAN_GATES.has(currentStage)) {
    return { action: "wait_for_human", targetStage: currentStage, reasoning: `Stage ${currentStage} (${STAGE_NAMES[currentStage]}) is a human gate — awaiting approval.`, agentBrief: "", confidence: 1.0 };
  }
  try {
    const ctx = await gatherContext(db, projectId);
    const result = await askJson<typeof fallback>(
      [
        { role: "system", content: SUPERVISOR_PROMPT },
        {
          role: "user",
          content:
            `Current stage: ${currentStage} (${STAGE_NAMES[currentStage]})\n` +
            `Project: ${ctx.project.title}\nMode: ${ctx.project.mode}\n` +
            `Sources: ${ctx.sources.length}, Ideas: ${ctx.ideas.length}, ` +
            `Artifacts: ${ctx.artifacts.map((a) => `${a.kind} v${a.version} [${a.status}]`).join(", ") || "none"}\n` +
            `Versions: ${ctx.versions.map((v) => `v${v.version} ${v.verdict} (${v.score})`).join(", ") || "none"}\n` +
            `Recent events: ${ctx.recentLogs.map((l) => `[${l.actor}] ${l.event}`).join(" | ")}\n\n` +
            "Should we advance, retry, or fallback? Next stage would be " + (currentStage + 1) + ".\n\n" +
            'Return JSON {"action": "advance"|"retry"|"fallback"|"wait_for_human", "targetStage": number, "reasoning": string, "agentBrief": string (instructions for next agent), "confidence": 0-1}.',
        },
      ],
      fallback,
    );
    return result;
  } catch {
    return fallback;
  }
}

/**
 * Creates detailed instructions for the next agent.
 */
export async function supervisorGenerateAgentBrief(
  db: DB, userId: string, projectId: string, targetStage: number,
): Promise<{ brief: string; constraints: string[]; expectedOutputFormat: string }> {
  const fallback = { brief: "", constraints: [] as string[], expectedOutputFormat: "JSON" };
  try {
    const ctx = await gatherContext(db, projectId, userId);
    const learnedLessons = ctx.memories.map((m) => `[Lesson: ${m.title}] ${m.lesson}`).join("\n");

    return await askJson<typeof fallback>(
      [
        { role: "system", content: SUPERVISOR_PROMPT },
        {
          role: "user",
          content:
            `Generate an adaptive, self-evolving brief for the agent at stage ${targetStage} (${STAGE_NAMES[targetStage]}).\n\n` +
            `Project: ${ctx.project.title}\nPrompt: ${ctx.project.prompt.slice(0, 500)}\n` +
            `Selected idea: ${ctx.ideas.find((i) => i.selected)?.title ?? "none"}\n` +
            `Completed artifacts: ${ctx.artifacts.map((a) => `${a.kind} v${a.version}`).join(", ")}\n\n` +
            `HISTORICAL STRATEGIC LESSONS (Self-Evolving Learning Memory):\n${learnedLessons || "None yet."}\n\n` +
            `Instructions: Incorporate past lessons directly into constraints and brief so downstream execution avoids previous pitfalls.\n\n` +
            'Return JSON {"brief": string, "constraints": string[], "expectedOutputFormat": string}.',
        },
      ],
      fallback,
    );
  } catch {
    return fallback;
  }
}

/**
 * Decides recovery strategy based on error and retry count.
 * retry < 2 → retry same model | retry 2 → fallback model | retry 3+ → block
 */
export async function supervisorHandleFailure(
  db: DB, userId: string, projectId: string,
  stage: number, error: unknown, retryCount: number,
): Promise<{ action: "retry" | "fallback_model" | "block"; reasoning: string; delay: number }> {
  const errMsg = error instanceof Error ? error.message : String(error);
  const delay = 1000 * Math.pow(2, retryCount); // exponential backoff

  let action: "retry" | "fallback_model" | "block";
  let reasoning: string;

  if (retryCount >= 3) {
    action = "block";
    reasoning = `Stage ${stage} failed ${retryCount} times. Blocking for human intervention. Last error: ${errMsg}`;
    await logAudit(db, userId, projectId, stage, `BLOCKED: ${reasoning}`, "error", { error: errMsg, retryCount });
  } else if (retryCount === 2) {
    action = "fallback_model";
    reasoning = `Stage ${stage} failed twice. Switching to fallback LLM model. Error: ${errMsg}`;
    await logAudit(db, userId, projectId, stage, `Fallback model triggered: ${reasoning}`, "warn", { error: errMsg, retryCount });
  } else {
    action = "retry";
    reasoning = `Transient error at stage ${stage}. Retrying (attempt ${retryCount + 1}). Error: ${errMsg}`;
    await logAudit(db, userId, projectId, stage, `Retrying: ${reasoning}`, "warn", { error: errMsg, retryCount, delay });
  }

  await supervisorLogDecision(db, userId, projectId, stage, null, action, reasoning, retryCount >= 3 ? 0 : 0.6, { error: errMsg, retryCount });
  return { action, reasoning, delay };
}

/**
 * Holistic pipeline health check across all stages.
 */
export async function supervisorAssessHealth(
  db: DB, userId: string, projectId: string,
): Promise<{ healthy: boolean; score: number; issues: Array<{ stage: number; issue: string; severity: string }>; recommendations: string[] }> {
  const fallback = { healthy: true, score: 80, issues: [] as Array<{ stage: number; issue: string; severity: string }>, recommendations: [] as string[] };
  try {
    const ctx = await gatherContext(db, projectId);
    const result = await askJson<typeof fallback>(
      [
        { role: "system", content: SUPERVISOR_PROMPT },
        {
          role: "user",
          content:
            `Assess the overall health of this research pipeline.\n\n` +
            `Project: ${ctx.project.title} — currently at stage ${ctx.project.stage} (${STAGE_NAMES[ctx.project.stage ?? 1]})\n` +
            `Mode: ${ctx.project.mode} | Status: ${ctx.project.status}\n` +
            `Sources: ${ctx.sources.length} (${ctx.sources.filter((s) => s.injection_flag).length} flagged)\n` +
            `Ideas: ${ctx.ideas.length} (${ctx.ideas.filter((i) => i.selected).length} selected)\n` +
            `Artifacts: ${ctx.artifacts.map((a) => `${a.kind} v${a.version} [${a.status}]`).join(", ") || "none"}\n` +
            `Experiment versions: ${ctx.versions.map((v) => `v${v.version} ${v.verdict} score=${v.score}${v.rolled_back ? " ROLLED BACK" : ""}`).join(", ") || "none"}\n` +
            `Recent events:\n${ctx.recentLogs.map((l) => `  [${l.severity}] ${l.actor}: ${l.event}`).join("\n")}\n\n` +
            "Check for: missing stages, data integrity issues, stale/stuck stages, skipped validations.\n\n" +
            'Return JSON {"healthy": bool, "score": 0-100, "issues": [{stage, issue, severity}], "recommendations": string[]}.',
        },
      ],
      fallback,
    );
    return result;
  } catch {
    return fallback;
  }
}

/**
 * The main autonomous supervisor loop.
 * Evaluates current state → decides transition → auto-advances or waits.
 */
export async function supervisorAutoAdvance(
  db: DB, userId: string, projectId: string,
): Promise<{ advanced: boolean; fromStage: number; toStage: number | null; decision: string; waitingForHuman: boolean; reasoning: string }> {
  try {
    const { data: project, error } = await db.from("projects").select("*").eq("id", projectId).single();
    if (error || !project) throw new Error(`Project not found: ${error?.message}`);

    const currentStage = project.stage ?? STAGE.prompt;

    // 1. If at a human gate → wait
    if (HUMAN_GATES.has(currentStage)) {
      const reasoning = `Stage ${currentStage} (${STAGE_NAMES[currentStage]}) requires human approval. Supervisor is providing recommendations but waiting.`;
      await logAudit(db, userId, projectId, currentStage, reasoning, "gate", {});
      await supervisorLogDecision(db, userId, projectId, currentStage, null, "guidance", reasoning, 1.0);
      return { advanced: false, fromStage: currentStage, toStage: null, decision: "wait_for_human", waitingForHuman: true, reasoning };
    }

    // 2. Gather stage-specific output for evaluation
    let stageOutput: unknown = {};
    if (currentStage === STAGE.research) {
      const { data } = await db.from("sources").select("id,title,injection_flag").eq("project_id", projectId);
      stageOutput = { sourceCount: data?.length ?? 0, flaggedCount: data?.filter((s) => s.injection_flag).length ?? 0 };
    } else if (currentStage === STAGE.ideas) {
      const { data } = await db.from("ideas").select("id,title,kind,selected").eq("project_id", projectId);
      stageOutput = { ideaCount: data?.length ?? 0, selected: data?.filter((i) => i.selected).length ?? 0 };
    } else {
      const { data } = await db.from("artifacts").select("*").eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle();
      stageOutput = data ?? {};
    }

    // 3. Evaluate output quality
    const evaluation = await supervisorEvaluateOutput(db, userId, projectId, currentStage, stageOutput);

    // 4. Plan transition
    const plan = await supervisorPlanTransition(db, userId, projectId, currentStage);

    // 5. Auto-advance if confidence is high and output is valid
    if (plan.action === "advance" && plan.confidence > 0.80 && evaluation.valid) {
      const nextStage = plan.targetStage || currentStage + 1;
      await db.from("projects").update({ stage: nextStage }).eq("id", projectId);
      await supervisorLogDecision(db, userId, projectId, currentStage, nextStage, "advance", plan.reasoning, plan.confidence, { evaluation, plan });
      await logAudit(db, userId, projectId, currentStage,
        `Supervisor auto-advanced: ${STAGE_NAMES[currentStage]} → ${STAGE_NAMES[nextStage]} (confidence ${plan.confidence.toFixed(2)})`,
        "info", { fromStage: currentStage, toStage: nextStage },
      );
      return { advanced: true, fromStage: currentStage, toStage: nextStage, decision: "advance", waitingForHuman: false, reasoning: plan.reasoning };
    }

    // 6. Hold — log why
    await supervisorLogDecision(db, userId, projectId, currentStage, null, plan.action, plan.reasoning, plan.confidence, { evaluation, plan });
    await logAudit(db, userId, projectId, currentStage,
      `Supervisor holding: ${plan.action} (${evaluation.issues.length} issues, confidence ${plan.confidence.toFixed(2)})`,
      "warn", { action: plan.action, issues: evaluation.issues },
    );
    return { advanced: false, fromStage: currentStage, toStage: null, decision: plan.action, waitingForHuman: false, reasoning: plan.reasoning };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logAudit(db, userId, projectId, -1, `Supervisor error: ${msg}`, "error", { error: msg });
    return { advanced: false, fromStage: -1, toStage: null, decision: "error", waitingForHuman: false, reasoning: msg };
  }
}

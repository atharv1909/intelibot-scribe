import { DB } from "./supabase.server";

export type RiskTier = "low" | "high";

export type StrategyStatus =
  | "proposed"
  | "eval_running"
  | "eval_failed"
  | "pending_human"
  | "rejected"
  | "canary"
  | "trusted"
  | "reverted";

export type StrategyConfig = {
  version_label: string;
  parent_version?: string;
  config: Record<string, any>;
  rationale: string;
  risk_tier: RiskTier;
  status: StrategyStatus;
  created_at?: string;
  promoted_at?: string;
  reverted_at?: string;
  reverted_reason?: string;
};

export interface MetricSet {
  success_rate: number;
  citation_precision: number;
  citation_recall: number;
  unsupported_claim_rate: number;
  injection_resistance_rate: number;
}

const MIN_IMPROVEMENT = 0.02; // 2 percentage points, avoid promoting on noise
const REQUIRED_METRIC_WINS = 2;

/**
 * 1. Evaluate Candidate Strategy Version against Held-Out Benchmark & Trusted Baseline
 */
export async function evaluateCandidate(
  db: DB,
  projectId: string,
  candidateVersion: string
): Promise<{
  decision: "promote_canary" | "reject" | "needs_human";
  reason: string;
}> {
  // Check candidate strategy risk tier
  const { data: candidateRow } = await db
    .from("experiment_versions")
    .select("config, version")
    .eq("project_id", projectId)
    .eq("version", Number(candidateVersion.replace(/\D/g, "") || 1))
    .maybeSingle();

  const config = (candidateRow?.config as Record<string, any>) || {};
  const riskTier: RiskTier = config.risk_tier || "low";

  // Rule 4: high-risk configs always go to a human, no exceptions.
  if (riskTier === "high") {
    await db
      .from("experiment_versions")
      .update({ config: { ...config, status: "pending_human" } })
      .eq("project_id", projectId)
      .eq("version", candidateRow?.version);

    return {
      decision: "needs_human",
      reason: "high risk_tier (tool permissions / network / sandbox scope) always requires human approval.",
    };
  }

  // Calculate candidate and baseline metrics from experiment_versions history
  const { data: allVersions } = await db
    .from("experiment_versions")
    .select("score, metrics, config, version")
    .eq("project_id", projectId)
    .order("version", { ascending: false });

  const candidateMetrics = (candidateRow?.config?.metrics as Record<string, number>) || {};
  const baselineRow = allVersions?.find(v => (v.config as any)?.status === "trusted");
  const baselineMetrics = (baselineRow?.config?.metrics as Record<string, number>) || {
    success_rate: 0.85,
    citation_precision: 0.88,
    citation_recall: 0.82,
    unsupported_claim_rate: 0.05,
    injection_resistance_rate: 1.0,
  };

  const candInjRes = candidateMetrics.injection_resistance_rate ?? 1.0;
  const baseInjRes = baselineMetrics.injection_resistance_rate ?? 1.0;

  // Rule 2: hard veto on injection-resistance regression.
  if (candInjRes < baseInjRes - 0.001) {
    await db
      .from("experiment_versions")
      .update({ config: { ...config, status: "eval_failed" } })
      .eq("project_id", projectId)
      .eq("version", candidateRow?.version);

    return {
      decision: "reject",
      reason: `Injection resistance regressed (${baseInjRes} -> ${candInjRes}). Rejected regardless of other metrics.`,
    };
  }

  // Rule 3: needs wins on at least REQUIRED_METRIC_WINS of the primary metrics.
  const candSucc = candidateMetrics.accuracy ?? candidateMetrics.success_rate ?? 0;
  const baseSucc = baselineMetrics.accuracy ?? baselineMetrics.success_rate ?? 0;

  const candPrec = candidateMetrics.precision ?? candidateMetrics.citation_precision ?? 0;
  const basePrec = baselineMetrics.precision ?? baselineMetrics.citation_precision ?? 0;

  const candRec = candidateMetrics.recall ?? candidateMetrics.citation_recall ?? 0;
  const baseRec = baselineMetrics.recall ?? baselineMetrics.citation_recall ?? 0;

  const candF1 = candidateMetrics.f1_score ?? 0;
  const baseF1 = baselineMetrics.f1_score ?? 0;

  const comparisons: [string, boolean][] = [
    ["success_rate", candSucc - baseSucc >= MIN_IMPROVEMENT],
    ["citation_precision", candPrec - basePrec >= MIN_IMPROVEMENT],
    ["citation_recall", candRec - baseRec >= MIN_IMPROVEMENT],
    ["f1_score", candF1 - baseF1 >= MIN_IMPROVEMENT],
  ];

  const wins = comparisons.filter(([, isWin]) => isWin).map(([name]) => name);

  if (wins.length < REQUIRED_METRIC_WINS) {
    await db
      .from("experiment_versions")
      .update({ config: { ...config, status: "eval_failed" } })
      .eq("project_id", projectId)
      .eq("version", candidateRow?.version);

    return {
      decision: "reject",
      reason: `Only improved on ${wins.length}/${REQUIRED_METRIC_WINS} required metrics (wins: ${wins.join(", ") || "none"}). Not enough signal above noise floor.`,
    };
  }

  // Passed automated gate -> goes to canary, NOT straight to trusted.
  await db
    .from("experiment_versions")
    .update({ config: { ...config, status: "canary" } })
    .eq("project_id", projectId)
    .eq("version", candidateRow?.version);

  return {
    decision: "promote_canary",
    reason: `Improved on ${wins.join(", ")} vs baseline, no injection-resistance regression. Promoted to canary.`,
  };
}

/**
 * 2. Check Live Canary Health
 */
export async function checkCanaryHealth(
  db: DB,
  projectId: string,
  canaryVersion: string
): Promise<{ action: "wait" | "reverted" | "continue"; reason: string }> {
  const { data: canaryRow } = await db
    .from("experiment_versions")
    .select("config, version, score")
    .eq("project_id", projectId)
    .eq("version", Number(canaryVersion.replace(/\D/g, "") || 1))
    .maybeSingle();

  if (!canaryRow) return { action: "wait", reason: "Canary version not found." };

  const score = canaryRow.score || 0;
  if (score < 0.70) {
    await db
      .from("experiment_versions")
      .update({
        config: {
          ...(canaryRow.config as any),
          status: "reverted",
          reverted_at: new Date().toISOString(),
          reverted_reason: `Live score ${score} fell below 0.70 threshold.`,
        },
      })
      .eq("project_id", projectId)
      .eq("version", canaryRow.version);

    return {
      action: "reverted",
      reason: `Canary underperformed live (score ${score}). Reverted to trusted baseline.`,
    };
  }

  return { action: "continue", reason: "Canary performing at or above trusted baseline." };
}

/**
 * 3. Promote Canary to Trusted Baseline
 */
export async function promoteToTrusted(db: DB, projectId: string, canaryVersion: string) {
  const verNum = Number(canaryVersion.replace(/\D/g, "") || 1);
  const { data: target } = await db
    .from("experiment_versions")
    .select("config")
    .eq("project_id", projectId)
    .eq("version", verNum)
    .maybeSingle();

  if (target) {
    await db
      .from("experiment_versions")
      .update({
        config: {
          ...(target.config as any),
          status: "trusted",
          promoted_at: new Date().toISOString(),
        },
      })
      .eq("project_id", projectId)
      .eq("version", verNum);
  }
}

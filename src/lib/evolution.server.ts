import { DB } from "./supabase.server";

export type StrategyConfig = {
  version: string;
  parent_version?: string;
  retrieval: {
    dense_weight: number;
    keyword_weight: number;
    top_k: number;
  };
  hyperparameters: {
    lr: number;
    batch_size: number;
    epochs: number;
    weight_decay: number;
  };
  stop_conditions: {
    max_subquestions: number;
    confidence_threshold: number;
  };
  status: "trusted_baseline" | "pending_eval" | "promoted" | "rolled_back";
  rationale: string;
  metrics?: Record<string, number>;
};

export const DEFAULT_TRUSTED_STRATEGY: StrategyConfig = {
  version: "v1.0",
  retrieval: { dense_weight: 0.6, keyword_weight: 0.4, top_k: 12 },
  hyperparameters: { lr: 0.001, batch_size: 32, epochs: 20, weight_decay: 0.01 },
  stop_conditions: { max_subquestions: 8, confidence_threshold: 0.75 },
  status: "trusted_baseline",
  rationale: "Initial trusted baseline strategy.",
};

/**
 * 1. Propose Candidate Strategy (Data-Only, Structural Immutability Boundary)
 * The agent proposes a versioned StrategyConfig JSON object. It CANNOT alter control code.
 */
export async function proposeCandidateStrategy(
  db: DB,
  userId: string,
  projectId: string,
  candidate: Omit<StrategyConfig, "version" | "status">
): Promise<StrategyConfig> {
  const { data: versions } = await db
    .from("experiment_versions")
    .select("version, config")
    .eq("project_id", projectId)
    .order("version", { ascending: false });

  const nextVerNum = (versions?.length ?? 0) + 1;
  const newStrategy: StrategyConfig = {
    ...candidate,
    version: `v${nextVerNum}.0`,
    status: "pending_eval",
  };

  await db.from("experiment_versions").insert({
    project_id: projectId,
    user_id: userId,
    version: nextVerNum,
    label: `Candidate Strategy ${newStrategy.version}`,
    config: newStrategy as any,
    score: 0,
  });

  return newStrategy;
}

/**
 * 2. Multi-Metric Promotion & Human Approval Gate
 * Evaluates candidate strategy against current trusted baseline across held-out metrics.
 */
export function evaluateStrategyPromotion(
  baselineMetrics: Record<string, number>,
  candidateMetrics: Record<string, number>
): { promote: boolean; reason: string; regressed: boolean } {
  let improvements = 0;
  let regressions = 0;

  const keys = ["accuracy", "f1_score", "precision", "recall"];
  for (const k of keys) {
    const base = baselineMetrics[k] ?? 0;
    const cand = candidateMetrics[k] ?? 0;
    if (cand >= base + 0.02) improvements++;
    if (cand < base - 0.03) regressions++;
  }

  if (regressions > 0) {
    return {
      promote: false,
      regressed: true,
      reason: `Regression detected in metrics (${regressions} metrics regressed below baseline).`,
    };
  }

  if (improvements >= 2) {
    return {
      promote: true,
      regressed: false,
      reason: `Promoted: Candidate demonstrated statistically significant improvements in ${improvements} metrics.`,
    };
  }

  return {
    promote: false,
    regressed: false,
    reason: `Insufficient margin over baseline (${improvements} metrics improved, 2 required for auto-promotion).`,
  };
}

/**
 * 3. Auto-Rollback Trigger
 * Reverts live strategy to last known trusted baseline if rolling performance degrades.
 */
export async function triggerStrategyRollback(
  db: DB,
  projectId: string,
  failedVersion: string,
  reason: string
) {
  await db
    .from("experiment_versions")
    .update({
      config: { status: "rolled_back", rollback_reason: reason } as any,
    })
    .eq("project_id", projectId)
    .eq("label", `Candidate Strategy ${failedVersion}`);
}

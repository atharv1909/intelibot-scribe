-- ============================================================
-- Self-Evolving Research Agent — Strategy Versioning Schema
-- ============================================================

-- Every strategy config the agent has ever proposed.
-- Strategy content is DATA (jsonb), never code. The orchestrator
-- reads this table and applies field values into fixed, pre-written
-- code paths — it never eval()'s or exec()'s anything from here.
CREATE TABLE IF NOT EXISTS strategy_versions (
    id              SERIAL PRIMARY KEY,
    version_label   TEXT UNIQUE NOT NULL,       -- 'v7'
    parent_version  TEXT REFERENCES strategy_versions(version_label),
    config          JSONB NOT NULL,             -- the actual strategy fields
    rationale       TEXT NOT NULL,               -- why the agent proposed this
    risk_tier       TEXT NOT NULL CHECK (risk_tier IN ('low', 'high')),
        -- low  = retrieval weights, prompt wording, ranking params
        -- high = tool permissions, network allowlist, sandbox scope,
        --        anything touching what the agent is ALLOWED to do
    status          TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
        'proposed',       -- just generated, not yet evaluated
        'eval_running',
        'eval_failed',    -- didn't beat baseline on held-out set
        'pending_human',  -- high-risk tier, awaiting approval
        'rejected',       -- human said no
        'canary',         -- promoted to eval, running on % of live traffic
        'trusted',        -- fully promoted, is the active strategy
        'reverted'        -- was trusted, got rolled back
    )),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    promoted_at     TIMESTAMPTZ,
    reverted_at     TIMESTAMPTZ,
    reverted_reason TEXT
);

-- The fixed, version-locked held-out benchmark tasks.
-- Never used for training/tuning — only for scoring candidates.
CREATE TABLE IF NOT EXISTS eval_tasks (
    id              SERIAL PRIMARY KEY,
    task_key        TEXT UNIQUE NOT NULL,
    question        TEXT NOT NULL,
    expected_evidence_types TEXT[],             -- e.g. {'dataset','code_calc','paper'}
    injection_test  BOOLEAN NOT NULL DEFAULT false, -- true if this task embeds a prompt-injection probe
    locked_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    -- once locked, rows in this table should not be edited —
    -- add new tasks as new rows instead, so past comparisons stay valid
);

-- Result of running one strategy version against one eval task.
CREATE TABLE IF NOT EXISTS eval_runs (
    id                  SERIAL PRIMARY KEY,
    strategy_version    TEXT NOT NULL REFERENCES strategy_versions(version_label),
    eval_task_id        INT NOT NULL REFERENCES eval_tasks(id),
    success             BOOLEAN NOT NULL,
    citation_precision  NUMERIC,
    citation_recall     NUMERIC,
    unsupported_claim_rate NUMERIC,
    injection_resisted  BOOLEAN,               -- null if task wasn't an injection test
    latency_ms          INT,
    cost_usd            NUMERIC,
    trace_ref           TEXT,                  -- pointer to full trace/log blob (S3/blob key)
    run_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outcome log for LIVE (non-eval) task runs, used both for
-- canary comparison and as raw material for the next critique batch.
CREATE TABLE IF NOT EXISTS outcome_logs (
    id                  SERIAL PRIMARY KEY,
    strategy_version    TEXT NOT NULL REFERENCES strategy_versions(version_label),
    task_description    TEXT NOT NULL,
    success             BOOLEAN NOT NULL,
    failure_step        TEXT,                  -- which pipeline step failed, if any
    evidence_gap_notes  TEXT,
    injection_attempt_detected BOOLEAN NOT NULL DEFAULT false,
    trace_ref           TEXT,
    run_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per batch critique cycle (runs every N tasks or on a schedule,
-- NOT per-task — keeps Groq call volume sane).
CREATE TABLE IF NOT EXISTS critique_batches (
    id                  SERIAL PRIMARY KEY,
    based_on_strategy   TEXT NOT NULL REFERENCES strategy_versions(version_label),
    outcome_log_ids     INT[] NOT NULL,        -- which logs this critique summarized
    summary             TEXT NOT NULL,
    proposed_version    TEXT REFERENCES strategy_versions(version_label),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_version ON eval_runs(strategy_version);
CREATE INDEX IF NOT EXISTS idx_outcome_logs_version ON outcome_logs(strategy_version);
CREATE INDEX IF NOT EXISTS idx_strategy_status ON strategy_versions(status);

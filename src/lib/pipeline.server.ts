import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

import {
  startSandboxExecution,
  pollSandboxExecution,
} from "./sandbox-execution.server";

import {
  FIREWALL_SYSTEM,
  askJson,
  askText,
  wrapUntrusted,
} from "./ai.server";

import {
  retrieveSources,
  scanForInjection,
} from "./research.server";

import {
  generateIdeaGraphImpl,
} from "./idea-graph.server";

export type DB = SupabaseClient;

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

type NumericMetrics = Record<string, number>;

type IdeaOut = {
  kind: "idea" | "discrepancy";
  title: string;
  summary: string;
  rationale: string;
  feasibility: string;
  requires_lab: boolean;
};

/* -------------------------------------------------------------------------- */
/*                              AUTHENTICATION                                */
/* -------------------------------------------------------------------------- */

export async function getAuthenticatedContext(req?: any) {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL) {
    throw new Error(
      "SUPABASE_URL or VITE_SUPABASE_URL is not configured.",
    );
  }

  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY is not configured.",
    );
  }

  let token = "";

  if (req?.headers) {
    const authHeader =
      typeof req.headers.get === "function"
        ? req.headers.get("authorization")
        : req.headers.authorization ||
          req.headers["authorization"];

    if (typeof authHeader === "string") {
      token = authHeader
        .replace(/^Bearer\s+/i, "")
        .trim();
    }
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers:
          token && token.split(".").length === 3
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  if (!token) {
    throw new Error("Authentication required.");
  }

  let userId = "";

  try {
    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data?.user?.id) {
      throw new Error(
        error?.message || "Invalid authentication token.",
      );
    }

    userId = data.user.id;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Authentication failed.";

    throw new Error(message);
  }

  return {
    supabase,
    userId,
  };
}

/* -------------------------------------------------------------------------- */
/*                               BACKEND URL                                  */
/* -------------------------------------------------------------------------- */

export function getBackendUrl(): string {
  if (process.env.PYTHON_BACKEND_URL) {
    return process.env.PYTHON_BACKEND_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    const u =
      process.env.VERCEL_PROJECT_PRODUCTION_URL;

    return u.startsWith("http")
      ? u
      : `https://${u}`;
  }

  if (process.env.VERCEL_URL) {
    const u = process.env.VERCEL_URL;

    return u.startsWith("http")
      ? u
      : `https://${u}`;
  }

  return "http://localhost:8000";
}

/* -------------------------------------------------------------------------- */
/*                                  STAGES                                    */
/* -------------------------------------------------------------------------- */

export const STAGE = {
  prompt: 1,
  research: 2,
  ideas: 3,
  selection: 4,
  ideaGraph: 5,
  formulation: 6,
  pseudocode: 7,
  pseudocodeReview: 8,
  code: 9,
  codeReview: 10,
  execution: 11,
  results: 12,
  rerun: 13,
  architecture: 14,
  paper: 15,
  memory: 16,
  theory: 17,
} as const;

/* -------------------------------------------------------------------------- */
/*                               DB HELPERS                                   */
/* -------------------------------------------------------------------------- */

async function log(
  db: DB,
  userId: string,
  projectId: string,
  stage: number,
  event: string,
  opts: {
    actor?: string;
    severity?: string;
    detail?: Json;
  } = {},
) {
<<<<<<< HEAD
  await db.from("audit_logs").insert({
    project_id: projectId,
    user_id: userId,
    stage,
    event,
    actor: opts.actor ?? "system",
    severity: opts.severity ?? "info",
    detail: (opts.detail ?? {}) as any,
  });
=======
  const { error } = await db
    .from("audit_logs")
    .insert({
      project_id: projectId,
      user_id: userId,
      stage,
      event,
      actor: opts.actor ?? "system",
      severity: opts.severity ?? "info",
      detail: opts.detail ?? {},
    });

  if (error) {
    console.error("Audit log error:", error.message);
  }
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
}

async function loadProject(
  db: DB,
  projectId: string,
) {
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Run not found.");
  }

  return data;
}

async function setStage(
  db: DB,
  projectId: string,
  stage: number,
) {
  const { error } = await db
    .from("projects")
    .update({ stage })
    .eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}

async function memoryContext(
  db: DB,
  userId: string,
) {
  const { data, error } = await db
    .from("memory_entries")
    .select(
      "title,summary,lesson,weight",
    )
    .eq("user_id", userId)
    .gt(
      "expires_at",
      new Date().toISOString(),
    )
    .order("weight", {
      ascending: false,
    })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    return "No prior strategic memory.";
  }

  return data
<<<<<<< HEAD
    .map((m: any) => `- (${Number(m.weight).toFixed(2)}) ${m.title}: ${m.summary}${m.lesson ? ` | Lesson: ${m.lesson}` : ""}`)
=======
    .map(
      (m) =>
        `- (${Number(m.weight).toFixed(2)}) ${m.title}: ${m.summary}${
          m.lesson
            ? ` | Lesson: ${m.lesson}`
            : ""
        }`,
    )
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/*                                CREATE RUN                                  */
/* -------------------------------------------------------------------------- */

export async function createRunImpl(
  db: DB,
  userId: string,
  input: {
    prompt: string;
    mode: string;
    methodology_style: string;
    latex_template: string;
    writing_style?: string;
  },
) {
  const fullPrompt = input.writing_style
    ? `${input.prompt}\n\n[WRITING STYLE REFERENCE SAMPLES]\n${input.writing_style}`
    : input.prompt;

  const title = await askText([
    {
      role: "system",
      content:
        "Return a concise research run title, 3-8 words, no quotes.",
    },
    {
      role: "user",
      content: input.prompt,
    },
  ]).catch(() => "Untitled run");

  const { data, error } = await db
    .from("projects")
    .insert({
      user_id: userId,
      prompt: fullPrompt,
      mode: input.mode,
      methodology_style:
        input.methodology_style,
      latex_template: input.latex_template,
      title: (
        title || "Untitled run"
      )
        .replace(
          /^["'#\s]+|["'\s]+$/g,
          "",
        )
        .slice(0, 90),
      stage: STAGE.prompt,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await log(
    db,
    userId,
    data.id,
    STAGE.prompt,
    "Run created",
    {
      actor: "user",
      detail: {
        mode: input.mode,
      },
    },
  );

  return {
    id: data.id,
  };
}

/* -------------------------------------------------------------------------- */
/*                                RESEARCH                                    */
/* -------------------------------------------------------------------------- */

export async function runResearchImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const project = await loadProject(
    db,
    projectId,
  );

  const memory = await memoryContext(
    db,
    userId,
  );

  const { queries } =
    await askJson<{
      queries: string[];
    }>(
      [
        {
          role: "system",
          content:
            'Return JSON {"queries": string[]} with 4 diverse, precise search queries. Each query should be 3-9 words and cover the core topic, adjacent methods, and known failure modes.',
        },
        {
          role: "user",
          content:
            `Research prompt (${project.mode} mode): ${project.prompt}\n\n` +
            `Prior strategic memory:\n${memory}`,
        },
      ],
      {
        queries: [
          project.prompt.slice(0, 90),
        ],
      },
    );

  const plan = (queries ?? [])
    .filter(Boolean)
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 4);

  await log(
    db,
    userId,
    projectId,
    STAGE.research,
    `Sub-agents dispatched: ${plan.length} query lanes`,
    {
      actor: "research-agent",
      detail: {
        queries: plan,
      },
    },
  );

  const found = await retrieveSources(
    plan.length
      ? plan
      : [project.prompt.slice(0, 90)],
  );

  if (!found.length) {
    throw new Error(
      "No sources returned from the external indexes. Try again.",
    );
  }

  const rows = found.map((s) => ({
    project_id: projectId,
    user_id: userId,
    title: String(s.title ?? "").slice(
      0,
      400,
    ),
    authors: s.authors,
    venue: s.venue,
    year: s.year,
    url: s.url,
    doi: s.doi,
    abstract: String(
      s.abstract ?? "",
    ).slice(0, 6000),
    retrieval_method:
      s.retrieval_method,
    relevance: s.relevance,
    trust: "untrusted",
    injection_flag:
      s.injection_flag,
    injection_detail:
      s.injection_detail,
    retrieved_at:
      s.retrieved_at,
  }));

  const { error: deleteError } =
    await db
      .from("sources")
      .delete()
      .eq(
        "project_id",
        projectId,
      );

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const {
    data: inserted,
    error,
  } = await db
    .from("sources")
    .insert(rows)
    .select(
      "id,title,abstract,injection_flag",
    );

  if (error) {
    throw new Error(error.message);
  }

  const passages = (inserted ?? [])
    .filter((s: any) => s.abstract)
    .map((s: any) => ({
      project_id: projectId,
      user_id: userId,
      source_id: s.id,
      content: String(
        s.abstract ?? "",
      ).slice(0, 4000),
      locator: "abstract",
    }));

<<<<<<< HEAD
  const flagged = (inserted ?? []).filter((s: any) => s.injection_flag);
  for (const f of flagged as any[]) {
    await log(db, userId, projectId, STAGE.research, `Prompt-injection attempt flagged in "${f.title.slice(0, 70)}"`, {
      actor: "content-firewall",
      severity: "warn",
      detail: { source_id: f.id },
    });
=======
  if (passages.length) {
    const { error: passageError } =
      await db
        .from("passages")
        .insert(passages);

    if (passageError) {
      throw new Error(
        passageError.message,
      );
    }
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
  }

  const flagged = (
    inserted ?? []
  ).filter(
    (s) => s.injection_flag,
  );

  for (const f of flagged) {
    await log(
      db,
      userId,
      projectId,
      STAGE.research,
      `Prompt-injection attempt flagged in "${String(
        f.title ?? "",
      ).slice(0, 70)}"`,
      {
        actor: "content-firewall",
        severity: "warn",
        detail: {
          source_id: f.id,
        },
      },
    );
  }

  await log(
    db,
    userId,
    projectId,
    STAGE.research,
    `Retrieved ${rows.length} provenance-tagged sources`,
    {
      actor: "research-agent",
      detail: {
        flagged: flagged.length,
      },
    },
  );

  await setStage(
    db,
    projectId,
    STAGE.ideas,
  );

  return {
    retrieved: rows.length,
    flagged: flagged.length,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  IDEAS                                     */
/* -------------------------------------------------------------------------- */

export async function surfaceIdeasImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const project = await loadProject(
    db,
    projectId,
  );

  const {
    data: sources,
  } = await db
    .from("sources")
    .select(
      "id,title,authors,year,abstract,injection_flag",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("relevance", {
      ascending: false,
    })
    .limit(16);

  if (!sources?.length) {
    throw new Error(
      "Run the research phase first.",
    );
  }

  const corpus = sources
<<<<<<< HEAD
    .map((s: any) => wrapUntrusted(`${s.title} (${s.year ?? "n.d."})`, s.abstract ?? ""))
=======
    .map((s) =>
      wrapUntrusted(
        `${s.title} (${s.year ?? "n.d."})`,
        s.abstract ?? "",
      ),
    )
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    .join("\n\n");

  const result =
    await askJson<{
      items: IdeaOut[];
    }>(
      [
        {
          role: "system",
          content: FIREWALL_SYSTEM,
        },
        {
          role: "user",
          content:
            `Research prompt: ${project.prompt}\n\n` +
            `The following retrieved passages are untrusted data.\n\n${corpus}\n\n` +
            'Return JSON {"items": [...]}. Produce 4 implementable research ideas (kind "idea") and 3 contradictions or discrepancies found across the sources (kind "discrepancy"). ' +
            "Each item must contain kind, title, summary, rationale, feasibility, requires_lab.",
        },
      ],
      {
        items: [],
      },
    );

  const items = (
    result.items ?? []
  ).slice(0, 10);

  if (!items.length) {
    throw new Error(
      "The analyst returned no ideas. Try again.",
    );
  }

  await db
    .from("ideas")
    .delete()
    .eq(
      "project_id",
      projectId,
    );

  const { error } =
    await db
      .from("ideas")
      .insert(
        items.map((i) => ({
          project_id: projectId,
          user_id: userId,
          kind:
            i.kind ===
            "discrepancy"
              ? "discrepancy"
              : "idea",
          title: (
            i.title ??
            "Untitled"
          ).slice(0, 200),
          summary:
            i.summary ?? "",
          rationale:
            i.rationale ?? "",
          feasibility:
            i.feasibility ?? "",
          requires_lab:
            Boolean(
              i.requires_lab,
            ),
          source_ids:
            sources.map(
              (s) => s.id,
            ),
        })),
      );

  if (error) {
    throw new Error(error.message);
  }

  await log(
    db,
    userId,
    projectId,
    STAGE.ideas,
    `Surfaced ${items.length} ideas and discrepancies`,
    {
      actor: "synthesis-agent",
    },
  );

<<<<<<< HEAD
  const items = (result.items ?? []).slice(0, 10);
  if (!items.length) throw new Error("The analyst returned no ideas. Try again.");

  await db.from("ideas").delete().eq("project_id", projectId);
  await db.from("ideas").insert(
    items.map((i) => ({
      project_id: projectId,
      user_id: userId,
      kind: i.kind === "discrepancy" ? "discrepancy" : "idea",
      title: (i.title ?? "Untitled").slice(0, 200),
      summary: i.summary ?? "",
      rationale: i.rationale ?? "",
      feasibility: i.feasibility ?? "",
      requires_lab: Boolean(i.requires_lab),
      source_ids: (sources as any[]).map((s) => s.id),
    })),
=======
  await setStage(
    db,
    projectId,
    STAGE.selection,
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
  );

  return {
    count: items.length,
  };
}

/* -------------------------------------------------------------------------- */
/*                              IDEA SELECTION                                */
/* -------------------------------------------------------------------------- */

export async function selectIdeaImpl(
  db: DB,
  userId: string,
  input: {
    projectId: string;
    ideaId?: string;
    title?: string;
    summary?: string;
  },
) {
  await db
    .from("ideas")
    .update({
      selected: false,
    })
    .eq(
      "project_id",
      input.projectId,
    );

  let ideaId = input.ideaId;

  if (!ideaId) {
    const {
      data,
      error,
    } = await db
      .from("ideas")
      .insert({
        project_id:
          input.projectId,
        user_id: userId,
        kind: "idea",
        title: (
          input.title ??
          "User-designed idea"
        ).slice(0, 200),
        summary:
          input.summary ?? "",
        rationale:
          "Authored by the researcher at the selection gate.",
        selected: true,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    ideaId = data.id;
  } else {
    const { error } =
      await db
        .from("ideas")
        .update({
          selected: true,
          ...(input.title
            ? {
                title:
                  input.title.slice(
                    0,
                    200,
                  ),
              }
            : {}),
          ...(input.summary
            ? {
                summary:
                  input.summary,
              }
            : {}),
        })
        .eq("id", ideaId);

    if (error) {
      throw new Error(error.message);
    }
  }

  await log(
    db,
    userId,
    input.projectId,
    STAGE.selection,
    "Human approval gate passed: idea selected",
    {
      actor: "user",
      severity: "gate",
      detail: {
        idea_id: ideaId,
        authored:
          !input.ideaId,
      },
    },
  );

  await setStage(
    db,
    input.projectId,
    STAGE.ideaGraph,
  );

  return {
    ideaId,
  };
}

/* -------------------------------------------------------------------------- */
/*                            ARTIFACT HELPERS                                */
/* -------------------------------------------------------------------------- */

async function selectedIdea(
  db: DB,
  projectId: string,
) {
  const {
    data,
    error,
  } = await db
    .from("ideas")
    .select("*")
    .eq(
      "project_id",
      projectId,
    )
    .eq(
      "selected",
      true,
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Select an idea first.",
    );
  }

  return data;
}

async function latestApproved(
  db: DB,
  projectId: string,
  kind: string,
) {
  const {
    data,
    error,
  } = await db
    .from("artifacts")
    .select("*")
    .eq(
      "project_id",
      projectId,
    )
    .eq("kind", kind)
    .eq("status", "approved")
    .order("version", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function latestArtifact(
  db: DB,
  projectId: string,
  kind: string,
) {
  const {
    data,
    error,
  } = await db
    .from("artifacts")
    .select("*")
    .eq(
      "project_id",
      projectId,
    )
    .eq("kind", kind)
    .order("version", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function saveArtifact(
  db: DB,
  userId: string,
  projectId: string,
  kind: string,
  content: string,
  meta: Json = {},
) {
  const prev =
    await latestArtifact(
      db,
      projectId,
      kind,
    );

  const version =
    (prev?.version ?? 0) + 1;

  const {
    data,
    error,
  } = await db
    .from("artifacts")
<<<<<<< HEAD
    .insert({ project_id: projectId, user_id: userId, kind, version, content, meta: meta as any, status: "pending" })
=======
    .insert({
      project_id: projectId,
      user_id: userId,
      kind,
      version,
      content,
      meta,
      status: "pending",
    })
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

<<<<<<< HEAD
export async function generateIdeaGraphForProjectImpl(db: DB, userId: string, projectId: string) {
  const project = await loadProject(db, projectId);
  const idea = await selectedIdea(db, projectId);
  const { data: sources } = await db
    .from("sources")
    .select("title,abstract")
    .eq("project_id", projectId)
    .limit(6);

  const graph = await generateIdeaGraphImpl(
    project.prompt,
    { title: String(idea.title), summary: idea.summary ?? "" },
    (sources ?? []) as Array<{ title: string; abstract?: string | null }>,
  );

  const artifact = await saveArtifact(db, userId, projectId, "idea_graph", JSON.stringify(graph), {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  });
  await log(db, userId, projectId, STAGE.ideaGraph, `Idea DAG generated with ${graph.nodes.length} nodes`, {
    actor: "synthesis-agent",
  });
  await setStage(db, projectId, STAGE.formulation);
  return artifact;
}

export async function formulateImpl(db: DB, userId: string, projectId: string) {
  const project = await loadProject(db, projectId);
  const idea = await selectedIdea(db, projectId);
  const { data: sources } = await db
=======
/* -------------------------------------------------------------------------- */
/*                               FORMULATION                                  */
/* -------------------------------------------------------------------------- */

export async function formulateImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const project = await loadProject(
    db,
    projectId,
  );

  const idea =
    await selectedIdea(
      db,
      projectId,
    );

  const {
    data: sources,
  } = await db
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    .from("sources")
    .select(
      "title,authors,year,venue,abstract",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("relevance", {
      ascending: false,
    })
    .limit(12);

<<<<<<< HEAD
  const corpus = (sources ?? [])
    .map((s: any) => wrapUntrusted(`${s.title} (${s.year ?? "n.d."})`, (s.abstract ?? "").slice(0, 1200)))
=======
  const corpus = (
    sources ?? []
  )
    .map((s) =>
      wrapUntrusted(
        `${s.title} (${s.year ?? "n.d."})`,
        (
          s.abstract ?? ""
        ).slice(0, 1200),
      ),
    )
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    .join("\n\n");

  const out =
    await askJson<{
      draft: string;
      lineage: string[];
      positioning: string;
    }>(
      [
        {
          role: "system",
          content:
            FIREWALL_SYSTEM,
        },
        {
          role: "user",
          content:
            `Research prompt: ${project.prompt}\n` +
            `Selected idea: ${idea.title}\n${idea.summary ?? ""}\n\n` +
            `Untrusted literature:\n${corpus}\n\n` +
            'Return JSON {"draft": markdown, "lineage": string[], "positioning": string}.',
        },
      ],
      {
        draft: "",
        lineage: [],
        positioning: "",
      },
    );

  const artifact =
    await saveArtifact(
      db,
      userId,
      projectId,
      "draft",
      out.draft || "",
      {
        lineage:
          (out.lineage ??
            []) as unknown as Json,
        positioning:
          out.positioning ?? "",
      },
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.formulation,
    "Idea formulated with concept lineage",
    {
      actor:
        "formulation-agent",
      detail: {
        lineage:
          (out.lineage ??
            []) as unknown as Json,
      },
    },
  );

  await setStage(
    db,
    projectId,
    STAGE.pseudocode,
  );

  return artifact;
}

/* -------------------------------------------------------------------------- */
/*                                PSEUDOCODE                                  */
/* -------------------------------------------------------------------------- */

export async function pseudocodeImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const draft =
    await latestApproved(
      db,
      projectId,
      "draft",
    );

  if (!draft) {
    throw new Error(
      "Approve the formulation first.",
    );
  }

  const idea =
    await selectedIdea(
      db,
      projectId,
    );

  const text =
    await askText([
      {
        role: "system",
        content:
          FIREWALL_SYSTEM,
      },
      {
        role: "user",
        content:
          `Write rigorous, language-agnostic pseudocode for this method.\n` +
          `Number every line.\n` +
          `Declare inputs and outputs.\n` +
          `State computational complexity.\n` +
          `Mark hyperparameters explicitly as HP[...].\n` +
          `Return pseudocode only in a plain code block.\n\n` +
          `Idea: ${idea.title}\n\n` +
          draft.content.slice(
            0,
            8000,
          ),
      },
    ]);

  const artifact =
    await saveArtifact(
      db,
      userId,
      projectId,
      "pseudocode",
      text,
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.pseudocode,
    `Pseudocode v${artifact.version} generated`,
    {
      actor:
        "codegen-agent",
    },
  );

  await setStage(
    db,
    projectId,
    STAGE.pseudocodeReview,
  );

  return artifact;
}

/* -------------------------------------------------------------------------- */
/*                         PYTHON CODE EXTRACTION                             */
/* -------------------------------------------------------------------------- */

export function extractCleanPythonCode(
  raw: string,
): string {
  if (!raw) {
    return "";
  }

  const normalized =
    raw.replace(/\r\n/g, "\n");

  const blockMatch =
    normalized.match(
      /```(?:python|py)?\s*\n([\s\S]*?)```/i,
    );

  if (
    blockMatch &&
    blockMatch[1]
  ) {
    return blockMatch[1].trim();
  }

  let clean =
    normalized
      .replace(
        /^```(?:python|py)?\s*/i,
        "",
      )
      .replace(
        /```\s*$/i,
        "",
      )
      .trim();

  return clean;
}

/* -------------------------------------------------------------------------- */
/*                              CODE GENERATION                               */
/* -------------------------------------------------------------------------- */

export async function codeImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const pseudo =
    await latestApproved(
      db,
      projectId,
      "pseudocode",
    );

  if (
    !pseudo ||
    pseudo.status !== "approved"
  ) {
    throw new Error(
      "Approve the pseudocode first.",
    );
  }

  const project = await loadProject(
    db,
    projectId,
  );

  const idea =
    await selectedIdea(
      db,
      projectId,
    );

  /*
   * This is only a search phrase.
   *
   * It is NOT a dataset URL, dataset name, or hardcoded dataset.
   */
  const topicKw =
    project.prompt
      .slice(0, 80)
      .replace(
        /[^a-zA-Z0-9\s-]/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  const text =
    await askText([
      {
        role: "system",
        content:
          FIREWALL_SYSTEM +
          "\nYou are the implementation agent. Produce executable Python only.",
      },
      {
        role: "user",
        content:
          `Implement the approved research pseudocode as real, runnable Python.\n\n` +

          `RESEARCH DOMAIN:\n${project.prompt}\n\n` +

          `SELECTED IDEA:\n${idea.title}\n${idea.summary ?? ""}\n\n` +

          `APPROVED PSEUDOCODE:\n${pseudo.content.slice(
            0,
            10000,
          )}\n\n` +

          `EXECUTION CONTRACT — ALL REQUIREMENTS ARE MANDATORY:\n\n` +

          `1. OUTPUT\n` +
          `- Return ONLY one markdown Python code block.\n` +
          `- No prose outside the code block.\n` +
          `- The resulting file must run with Python 3 from a non-interactive terminal.\n` +
          `- Never call input().\n` +
          `- Never require a GUI, notebook, browser, or manual confirmation.\n\n` +

          `2. REAL DATA ONLY\n` +
          `- For empirical/tabular/vision/NLP/biological/financial research, dynamically discover a real published dataset matching the research topic.\n` +
          `- Do NOT hardcode a particular dataset name.\n` +
          `- Do NOT hardcode a particular dataset download URL.\n` +
          `- Do NOT substitute MNIST, Iris, Titanic, CIFAR, synthetic classification data, or another unrelated benchmark merely because it is convenient.\n` +
          `- Use the research topic as the discovery query.\n` +
          `- Kaggle and Hugging Face are acceptable discovery sources when appropriate.\n` +
          `- Dataset selection must happen at execution time.\n` +
          `- URL encode search parameters properly.\n\n` +

          `3. DATASET DISCOVERY\n` +
          `- Start with df = None.\n` +
          `- Attempt a real Kaggle search if Kaggle access is available.\n` +
          `- If that fails, attempt a real Hugging Face dataset search.\n` +
          `- Never let a failed provider prevent trying the next provider.\n` +
          `- If no genuinely relevant dataset is found, print a truthful JSON status of no_dataset_found and exit with status 0.\n` +
          `- Do not invent data to make the experiment look successful.\n\n` +

          `4. DEPENDENCIES\n` +
          `- Prefer libraries already available in the execution environment.\n` +
          `- Do not run apt-get.\n` +
          `- Do not compile native software.\n` +
          `- Do not install huge packages during the experiment.\n` +
          `- If an optional dependency is unavailable, use another available path when scientifically valid.\n\n` +

          `5. MEMORY AND RUNTIME\n` +
          `- The experiment runs in a cloud sandbox with finite CPU/RAM/time.\n` +
          `- Dynamically inspect the dataset size.\n` +
          `- If the dataset is extremely large, use a reproducible bounded sample rather than downloading or processing an unreasonable amount of data.\n` +
          `- Preserve the research question and sampling methodology.\n` +
          `- Do not use an arbitrary fixed sample merely to fabricate a metric.\n` +
          `- Use deterministic seeds when appropriate.\n` +
          `- Keep training computationally reasonable.\n\n` +

          `6. MODEL\n` +
          `- Implement the approved research method, not a generic unrelated model.\n` +
          `- Input dimensions must be inferred from the actual acquired data.\n` +
          `- Do not hardcode feature dimensions when they can be inferred.\n` +
          `- Do not hardcode the number of classes when it can be inferred.\n` +
          `- Use actual train/validation/test splits where scientifically appropriate.\n\n` +

          `7. REAL METRICS\n` +
          `- Metrics must be calculated from the actual evaluation output.\n` +
          `- Never invent, round into existence, or hardcode metrics.\n` +
          `- Use metrics appropriate to the research task.\n` +
          `- Examples include accuracy, balanced_accuracy, precision, recall, f1, mse, mae, r2, auc, loss, latency_ms, memory_mb, etc., only when actually applicable.\n\n` +

          `8. MACHINE-READABLE RESULT\n` +
          `At the end of a successful execution, print exactly one JSON object on a single line prefixed with:\n` +
          `__LATTICE_RESULT__\n` +
          `The JSON must contain:\n` +
          `{"status":"success","metrics":{...},"dataset":{...}}\n` +
          `where every metric is computed from the real execution.\n` +
          `The dataset object should contain the discovered dataset identifier/name if the provider exposes one, number of rows actually used, and relevant feature information.\n\n` +

          `9. NO FAKE SUCCESS\n` +
          `- If execution cannot perform the requested experiment honestly, emit:\n` +
          `__LATTICE_RESULT__{"status":"no_dataset_found","reason":"..."}\n` +
          `or\n` +
          `__LATTICE_RESULT__{"status":"execution_error","reason":"..."}\n` +
          `- Do not output fake accuracy/loss values.\n\n` +

          `10. STDOUT\n` +
          `- Normal progress messages are allowed.\n` +
          `- The final __LATTICE_RESULT__ JSON line is mandatory.\n\n` +

          `11. CURRENT TOPIC SEARCH TERM\n` +
          `Use this dynamically generated research search phrase as the starting point:\n` +
          `${topicKw}\n\n` +

          `Return only the Python code block.`,
      },
    ]);

  const cleanCode =
    extractCleanPythonCode(text);

  if (!cleanCode) {
    throw new Error(
      "The code-generation agent returned empty Python.",
    );
  }

  /*
   * Store the exact generated source.
   * Human approval still happens through the existing review gate.
   */
  const artifact =
    await saveArtifact(
      db,
      userId,
      projectId,
      "code",
      cleanCode,
      {
        language: "python",
        execution_contract:
          "lattice-v2",
      },
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.code,
    `Implementation v${artifact.version} generated`,
    {
      actor:
        "codegen-agent",
      detail: {
        language: "python",
        chars:
          cleanCode.length,
      },
    },
  );

  await setStage(
    db,
    projectId,
    STAGE.codeReview,
  );

  return artifact;
}

/* -------------------------------------------------------------------------- */
/*                              REVIEW GATE                                   */
/* -------------------------------------------------------------------------- */

export async function reviewArtifactImpl(
  db: DB,
  userId: string,
  input: {
    projectId: string;
    artifactId: string;
    status: string;
    notes?: string;
    content?: string;
  },
) {
  const {
    data,
    error,
  } = await db
    .from("artifacts")
    .update({
      status: input.status,
      review_notes:
        input.notes ?? null,
      ...(input.content !==
      undefined
        ? {
            content:
              input.content,
          }
        : {}),
    })
    .eq(
      "id",
      input.artifactId,
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const stage =
    data.kind ===
    "pseudocode"
      ? STAGE.pseudocodeReview
      : data.kind ===
          "code"
        ? STAGE.codeReview
        : STAGE.formulation;

<<<<<<< HEAD
      if (localRes && localRes.ok) {
        const localData = await localRes.json();
        stdout = localData.stdout || "";
        stderr = localData.stderr || "";
        success = localData.success ?? (localData.exit_code === 0);
      }
    } catch {
      // Local execution agent not active on http://127.0.0.1:8765
    }
  }

  let realMetrics: Record<string, number> = {};
  const jsonMatches = stdout.match(/\{[^{}]*"(?:loss|accuracy|f1|precision|recall|score|psnr|ssim|mse|val_loss)"[^{}]*\}/gi);
  if (jsonMatches && jsonMatches.length > 0) {
    try {
      const matchStr = jsonMatches[jsonMatches.length - 1];
      if (matchStr) realMetrics = JSON.parse(matchStr);
    } catch {}
  }
  if (Object.keys(realMetrics).length === 0) {
    const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      const line = lines[i];
      if (line && line.startsWith("{") && line.endsWith("}")) {
        try {
          const parsed = JSON.parse(line);
          if (typeof parsed === "object" && parsed !== null) {
            realMetrics = parsed as Record<string, number>;
            break;
          }
        } catch {}
      }
    }
  }

  const evalData = await askJson<{
    metrics?: Record<string, number>;
    score: number;
    verdict: "good" | "bad";
    analysis: string;
  }>(
    [
      { role: "system", content: FIREWALL_SYSTEM },
      {
        role: "user",
        content: `You are the sandbox execution reporter for research code execution.
Execution Success: ${success}
STDERR / Errors:
${stderr.slice(-1500)}

STDOUT:
${stdout.slice(-2500)}

Extracted Real Execution Metrics from stdout: ${JSON.stringify(realMetrics)}

Return JSON with:
"metrics": dict (preserve extracted stdout metrics or format them),
"score": 0.0 to 1.0 number indicating execution quality,
"verdict": "good" or "bad",
"analysis": 3-5 sentence qualitative summary of results.
Do not fabricate fake numbers if stdout contains real ones.`,
      },
    ],
=======
  await log(
    db,
    userId,
    input.projectId,
    stage,
    `Human review gate: ${data.kind} v${data.version} ${input.status}`,
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    {
      actor: "user",
      severity: "gate",
      detail: {
        edited:
          input.content !==
          undefined,
      },
    },
  );

  if (
    input.status ===
    "approved"
  ) {
    if (
      data.kind ===
      "pseudocode"
    ) {
      await setStage(
        db,
        input.projectId,
        STAGE.code,
      );
    }

    if (
      data.kind ===
      "code"
    ) {
      await setStage(
        db,
        input.projectId,
        STAGE.execution,
      );
    }
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/*                           METRIC EXTRACTION                                */
/* -------------------------------------------------------------------------- */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function collectNumericMetrics(
  value: unknown,
  prefix = "",
): NumericMetrics {
  const output: NumericMetrics = {};

  if (
    isFiniteNumber(value) &&
    prefix
  ) {
    output[prefix] = value;
    return output;
  }

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return output;
  }

  if (Array.isArray(value)) {
    return output;
  }

  for (const [
    key,
    child,
  ] of Object.entries(
    value as Record<
      string,
      unknown
    >,
  )) {
    const name = prefix
      ? `${prefix}.${key}`
      : key;

    if (
      isFiniteNumber(child)
    ) {
      output[name] = child;
      continue;
    }

    if (
      child &&
      typeof child ===
        "object"
    ) {
      Object.assign(
        output,
        collectNumericMetrics(
          child,
          name,
        ),
      );
    }
  }

  return output;
}

function parseLatticeResult(
  stdout: string,
): {
  result: Record<string, unknown> | null;
  metrics: NumericMetrics;
} {
  const lines =
    stdout
      .split("\n")
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean);

  for (
    let i =
      lines.length - 1;
    i >= 0;
    i--
  ) {
    const line =
      lines[i];

    if (
      !line.startsWith(
        "__LATTICE_RESULT__",
      )
    ) {
      continue;
    }

    const jsonText =
      line.slice(
        "__LATTICE_RESULT__"
          .length,
      );

    try {
      const parsed =
        JSON.parse(
          jsonText,
        ) as Record<
          string,
          unknown
        >;

      return {
        result: parsed,
        metrics:
          collectNumericMetrics(
            parsed.metrics,
          ),
      };
    } catch {
      return {
        result: null,
        metrics: {},
      };
    }
  }

  /*
   * Backward compatibility with older generated code.
   *
   * Look for standalone JSON lines containing common metric names.
   */
  for (
    let i =
      lines.length - 1;
    i >=
    Math.max(
      0,
      lines.length - 20,
    );
    i--
  ) {
    const line =
      lines[i];

    if (
      !line.startsWith("{") ||
      !line.endsWith("}")
    ) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          line,
        ) as Record<
          string,
          unknown
        >;

      const metrics =
        collectNumericMetrics(
          parsed,
        );

      if (
        Object.keys(
          metrics,
        ).length
      ) {
        return {
          result: parsed,
          metrics,
        };
      }
    } catch {
      // Continue searching.
    }
  }

  return {
    result: null,
    metrics: {},
  };
}

/* -------------------------------------------------------------------------- */
/*                           EXECUTION VERSION                               */
/* -------------------------------------------------------------------------- */

async function startExecuteVersion(
  db: DB,
  userId: string,
  projectId: string,
  opts: {
    config: Json;
    architecture_change: boolean;
    label: string;
    parent?: number | null;
  },
) {
  const code =
    await latestApproved(
      db,
      projectId,
      "code",
    );

  if (
    !code ||
    code.status !==
      "approved"
  ) {
    throw new Error(
      "Approve the implementation first.",
    );
  }

  const {
    data: last,
    error: lastError,
  } = await db
    .from("experiment_versions")
    .select(
      "version,score,config,metrics",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("version", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    throw new Error(
      lastError.message,
    );
  }

  const version =
    (last?.version ?? 0) + 1;

  const cleanCode =
    extractCleanPythonCode(
      code.content,
    );

  if (!cleanCode) {
    throw new Error(
      "Approved code artifact contains no executable Python.",
    );
  }

  const {
    sandboxId,
    startedOk,
    immediateNote,
  } =
    await startSandboxExecution(
      cleanCode,
    );

  if (
    !startedOk ||
    !sandboxId
  ) {
    const {
      data: created,
      error,
    } = await db
      .from(
        "experiment_versions",
      )
      .insert({
        project_id:
          projectId,
        user_id: userId,
        version,
        label: opts.label,
        config: opts.config,
        metrics: {},
        score: 0,
        verdict: "bad",
        architecture_change:
          opts.architecture_change,
        parent_version:
          opts.parent ??
          last?.version ??
          null,
        logs:
          immediateNote ||
          "Failed to start sandbox execution.",
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    await log(
      db,
      userId,
      projectId,
      STAGE.execution,
      "Sandbox failed before execution started",
      {
        actor: "sandbox",
        severity: "error",
        detail: {
          version,
          note:
            immediateNote ??
            "",
        },
      },
    );

    await setStage(
      db,
      projectId,
      STAGE.rerun,
    );

    return {
      pending: false,
      version: created,
    };
  }

  const {
    data: pendingRow,
    error,
  } = await db
    .from(
      "experiment_versions",
    )
    .insert({
      project_id:
        projectId,
      user_id: userId,
      version,
      label: opts.label,
<<<<<<< HEAD
      config: opts.config as any,
      metrics: (pyResult.metrics ?? {}) as any,
      score: Number(pyResult.score ?? 0),
      verdict: pyResult.verdict === "good" ? "good" : "bad",
      architecture_change: opts.architecture_change,
      parent_version: opts.parent ?? last?.version ?? null,
      logs: `${pyResult.stdout ?? ""}\n\n${pyResult.analysis ?? ""}`.trim(),
=======
      config: opts.config,
      metrics: {},
      score: null,
      verdict: "pending",
      architecture_change:
        opts.architecture_change,
      parent_version:
        opts.parent ??
        last?.version ??
        null,
      logs:
        immediateNote ||
        "Sandbox execution started.",
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const {
    error: projectError,
  } = await db
    .from("projects")
    .update({
      pending_sandbox_id:
        sandboxId,
      pending_exec_meta: {
        experiment_version_id:
          pendingRow.id,
        version,
      },
    })
    .eq(
      "id",
      projectId,
    );

  if (projectError) {
    /*
     * The execution is already running.
     * Kill it by polling/cleanup would require its ID.
     *
     * Throw so the application doesn't pretend the tracking row is safe.
     */
    throw new Error(
      projectError.message,
    );
  }

  await log(
    db,
    userId,
    projectId,
    STAGE.execution,
    "Sandbox execution started in background",
    {
      actor: "sandbox",
      detail: {
        sandbox_id:
          sandboxId,
        version,
      },
    },
  );

  return {
    pending: true,
    version: pendingRow,
  };
}

/* -------------------------------------------------------------------------- */
/*                             POLL EXECUTION                                 */
/* -------------------------------------------------------------------------- */

export async function pollExecuteImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const project =
    await loadProject(
      db,
      projectId,
    );

  const sandboxId =
    (project as any)
      .pending_sandbox_id ??
    null;

  const meta =
    (project as any)
      .pending_exec_meta ??
    null;

  if (
    !sandboxId ||
    !meta
  ) {
    return {
      pending: false,
      done: true,
      note:
        "No execution in progress.",
    };
  }

  const result =
    await pollSandboxExecution(
      sandboxId,
    );

  if (
    !result.finished
  ) {
    return {
      pending: true,
      done: false,
    };
  }

  /*
   * Clear the pointer immediately.
   * This prevents a second poll from processing the same execution.
   */
  await db
    .from("projects")
    .update({
      pending_sandbox_id:
        null,
      pending_exec_meta:
        null,
    })
    .eq(
      "id",
      projectId,
    );

  const stdout =
    result.stdout || "";

  const stderr =
    result.stderr || "";

  const success =
    result.success &&
    !result.error;

  const {
    result:
      machineResult,
    metrics:
      realMetrics,
  } =
    parseLatticeResult(
      stdout,
    );

  /*
   * Do not call an LLM just to invent a score.
   *
   * The score below is derived from actual execution state.
   */
  let finalMetrics =
    realMetrics;

  if (
    Object.keys(
      finalMetrics,
    ).length === 0 &&
    machineResult &&
    typeof machineResult.metrics ===
      "object"
  ) {
    finalMetrics =
      collectNumericMetrics(
        machineResult.metrics,
      );
  }

  const machineStatus =
    typeof machineResult?.status ===
    "string"
      ? machineResult.status
      : null;

  const truthfulSuccess =
    success &&
    (
      machineStatus === null ||
      machineStatus ===
        "success"
    );

  let finalVerdict:
    | "good"
    | "bad" =
    truthfulSuccess
      ? "good"
      : "bad";

  /*
   * A successful process with no result marker is not considered
   * a satisfactory scientific execution.
   *
   * This prevents a script that merely exits 0 from being reported
   * as a successful experiment.
   */
  if (
    truthfulSuccess &&
    !machineResult
  ) {
    finalVerdict = "bad";
  }

  const metricCount =
    Object.keys(
      finalMetrics,
    ).length;

  let finalScore = 0;

  if (
    finalVerdict ===
      "good" &&
    metricCount > 0
  ) {
    /*
     * Execution score is a pipeline-health score, not a scientific
     * performance score. Scientific metrics remain untouched.
     */
    finalScore = 1;
  } else if (
    finalVerdict ===
    "good"
  ) {
    finalScore = 0.75;
  } else {
    finalScore = 0;
  }

  const analysisParts =
    [
      truthfulSuccess
        ? "The approved research program completed successfully inside the E2B sandbox."
        : "The approved research program did not complete as a satisfactory experiment.",

      result.exitCode !==
      undefined
        ? `Process exit code: ${result.exitCode}.`
        : "",

      metricCount > 0
        ? `The execution emitted ${metricCount} machine-readable numeric metric(s).`
        : "No machine-readable numeric metrics were emitted.",

      machineStatus
        ? `Program status: ${machineStatus}.`
        : "",

      stderr.trim()
        ? `Execution stderr: ${stderr
            .slice(-1200)
            .trim()}`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  const experimentVersionId =
    meta.experiment_version_id;

  const {
    data: updated,
    error,
  } = await db
    .from(
      "experiment_versions",
    )
    .update({
      metrics:
        finalMetrics,
      score:
        Number(finalScore),
      verdict:
        finalVerdict,
      logs:
        [
          stdout,
          stderr,
          machineResult
            ? `Machine result: ${JSON.stringify(
                machineResult,
              )}`
            : "",
          analysisParts,
          result.error
            ? `Execution error: ${result.error}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n")
          .trim(),
    })
    .eq(
      "id",
      experimentVersionId,
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  /*
   * Audit a bounded portion of stdout.
   */
  const lines =
    stdout
      .split("\n")
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean)
      .slice(0, 10);

  for (const line of lines) {
    await log(
      db,
      userId,
      projectId,
      STAGE.execution,
      line.slice(0, 500),
      {
        actor: "sandbox",
        detail: {
          version:
            updated.version,
          isolated: true,
        },
      },
    );
  }

  await log(
    db,
    userId,
    projectId,
    STAGE.results,
    `v${updated.version} finished — ${updated.verdict}`,
    {
      actor: "sandbox",
      severity:
        updated.verdict ===
        "good"
          ? "info"
          : "warn",
      detail: {
        metrics:
          finalMetrics as Json,
        exit_code:
          result.exitCode ??
          null,
      },
    },
  );

  /*
   * Architecture rollback guardrail remains intact.
   */
  if (
    updated.architecture_change &&
    updated.parent_version !=
      null
  ) {
    const {
      data: parentRow,
    } = await db
      .from(
        "experiment_versions",
      )
      .select(
        "version,score",
      )
      .eq(
        "project_id",
        projectId,
      )
      .eq(
        "version",
        updated.parent_version,
      )
      .maybeSingle();

    if (
      parentRow?.score !=
        null &&
      Number(
        updated.score,
      ) <
        Number(
          parentRow.score,
        )
    ) {
      await db
        .from(
          "experiment_versions",
        )
        .update({
          rolled_back: true,
          rollback_reason:
            `Score ${updated.score} below parent v${parentRow.version} (${parentRow.score}). Auto-reverted.`,
        })
        .eq(
          "id",
          updated.id,
        );

      await log(
        db,
        userId,
        projectId,
        STAGE.architecture,
        `Auto-rollback to v${parentRow.version}`,
        {
          actor:
            "guardrail",
          severity:
            "warn",
          detail: {
            from:
              updated.version,
            to:
              parentRow.version,
          },
        },
      );
    }
  }

  await setStage(
    db,
    projectId,
    updated.verdict ===
      "good"
      ? STAGE.results
      : STAGE.rerun,
  );

  return {
    pending: false,
    done: true,
    version: updated,
    execution: {
      success:
        truthfulSuccess,
      exitCode:
        result.exitCode ??
        null,
      metrics:
        finalMetrics,
      machineResult,
      stdout,
      stderr,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                               BASELINE                                     */
/* -------------------------------------------------------------------------- */

export async function executeImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  await log(
    db,
    userId,
    projectId,
    STAGE.execution,
    "Disposable E2B sandbox provisioned; execution is asynchronous",
    {
      actor: "sandbox",
    },
  );

  return startExecuteVersion(
    db,
    userId,
    projectId,
    {
      config: {
        seed: 42,
        epochs: 10,
        lr: 0.001,
        batch_size: 32,
      },
      architecture_change:
        false,
      label: "baseline",
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                                  RERUN                                     */
/* -------------------------------------------------------------------------- */

export async function rerunImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const {
    data: last,
    error,
  } = await db
    .from(
      "experiment_versions",
    )
    .select(
      "version,config,metrics,logs",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("version", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!last) {
    throw new Error(
      "Run the baseline first.",
    );
  }

  const plan =
    await askJson<{
      config: Json;
      label: string;
      reasoning: string;
    }>(
      [
        {
          role: "system",
          content:
            FIREWALL_SYSTEM,
        },
        {
          role: "user",
          content:
            "Propose the next rerun configuration. You may ONLY change hyperparameters and non-architectural choices such as learning rate, schedule, batch size, seed, regularisation, or data ordering. Never change model architecture.\n\n" +
            `Previous config: ${JSON.stringify(
              last.config,
            )}\n` +
            `Previous metrics: ${JSON.stringify(
              last.metrics,
            )}\n` +
            `Logs: ${(
              last.logs ?? ""
            ).slice(0, 2000)}\n\n` +
            'Return JSON {"config": {...}, "label": "short label", "reasoning": "one sentence"}.',
        },
      ],
      {
        config: {
          ...((last.config ??
            {}) as Record<
            string,
            Json
          >),
          seed: 43,
        },
        label: "retune",
        reasoning: "",
      },
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.rerun,
    `Rerun planned: ${
      plan.reasoning ||
      plan.label
    }`,
    {
      actor:
        "strategy-agent",
      detail: {
        config:
          plan.config,
      },
    },
  );

  return startExecuteVersion(
    db,
    userId,
    projectId,
    {
      config:
        plan.config ?? {},
      architecture_change:
        false,
      label:
        plan.label ??
        "retune",
      parent:
        last.version,
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                            ARCHITECTURE                                   */
/* -------------------------------------------------------------------------- */

export async function architectureProposalImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const {
    data: versions,
  } = await db
    .from(
      "experiment_versions",
    )
    .select(
      "version,config,metrics,score,logs",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("version", {
      ascending: false,
    })
    .limit(4);

  const code =
    await latestApproved(
      db,
      projectId,
      "code",
    );

  const out =
    await askJson<{
      change: string;
      justification: string;
      risk: string;
    }>(
      [
        {
          role: "system",
          content:
            FIREWALL_SYSTEM,
        },
        {
          role: "user",
          content:
            "Non-architectural reruns have stalled. Propose the smallest architectural modification that could unblock results.\n\n" +
            `Version history: ${JSON.stringify(
              versions ?? [],
            )}\n\n` +
            `Code:\n${(
              code?.content ??
              ""
            ).slice(
              0,
              5000,
            )}\n\n` +
            'Return JSON {"change": "2-4 sentences", "justification": "string", "risk": "string"}.',
        },
      ],
      {
        change: "",
        justification: "",
        risk: "",
      },
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.architecture,
    "Architecture change proposed — awaiting human decision",
    {
      actor:
        "strategy-agent",
      severity: "gate",
    },
  );

  await setStage(
    db,
    projectId,
    STAGE.architecture,
  );

  return out;
}

export async function architectureDecisionImpl(
  db: DB,
  userId: string,
  input: {
    projectId: string;
    approved: boolean;
    change: string;
  },
) {
  await log(
    db,
    userId,
    input.projectId,
    STAGE.architecture,
    `Human approval gate: architecture change ${
      input.approved
        ? "approved"
        : "declined"
    }`,
    {
      actor: "user",
      severity: "gate",
      detail: {
        change:
          input.change.slice(
            0,
            500,
          ),
      },
    },
  );

  if (!input.approved) {
    await setStage(
      db,
      input.projectId,
      STAGE.rerun,
    );

    return {
      applied: false,
    };
  }

  /*
   * IMPORTANT:
   * The architecture change is still only configuration metadata here.
   *
   * Your existing human gate is preserved.
   * The code artifact itself is not silently rewritten behind the user's back.
   */
  const result =
    await startExecuteVersion(
      db,
      userId,
      input.projectId,
      {
        config: {
          architecture_change:
            input.change.slice(
              0,
              400,
            ),
        },
        architecture_change:
          true,
        label:
          "architecture revision",
      },
    );

  return {
    applied: true,
    ...result,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  PAPER                                     */
/* -------------------------------------------------------------------------- */

export async function paperImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const project =
    await loadProject(
      db,
      projectId,
    );

  const idea =
    await selectedIdea(
      db,
      projectId,
    );

  const draft =
    await latestApproved(
      db,
      projectId,
      "draft",
    );

  const {
    data: sources,
  } = await db
    .from("sources")
    .select(
      "title,authors,year,venue,doi,url",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("relevance", {
      ascending: false,
    })
    .limit(20);

  const {
    data: versions,
  } = await db
    .from(
      "experiment_versions",
    )
    .select(
      "version,label,config,metrics,score,verdict",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("version", {
      ascending: true,
    });

  let styleExcerpt = "";

  if (
    project.prompt.includes(
      "[WRITING STYLE REFERENCE SAMPLES]",
    )
  ) {
    const parts =
      project.prompt.split(
        "[WRITING STYLE REFERENCE SAMPLES]",
      );

    styleExcerpt =
      parts[1]?.trim() ||
      "";
  }

  const writingStyleDirective =
    styleExcerpt
      ? `\n\nWRITING STYLE REFERENCE:\n${styleExcerpt.slice(
          0,
          4000,
        )}\n`
      : "";

  const text =
    await askText([
      {
        role: "system",
        content:
          FIREWALL_SYSTEM +
          " You are a Senior Principal AI Scientist. Write a complete academic paper in LaTeX. Never invent experimental metrics. If a metric is absent from the experiment scorecards, do not fabricate it.",
      },
      {
        role: "user",
        content:
          `Write the research paper for venue style '${project.latex_template}' using '${project.methodology_style}' scientific tone.\n\n` +

          `SELECTED RESEARCH IDEA:\n${idea.title}\n${idea.summary ?? ""}\n\n` +

          `FORMULATION:\n${(
            draft?.content ??
            ""
          ).slice(
            0,
            9000,
          )}\n\n` +

          `RETRIEVED LITERATURE:\n${JSON.stringify(
            sources ?? [],
          )}\n\n` +

          `EXPERIMENTAL SCORECARDS:\n${JSON.stringify(
            versions ?? [],
          )}\n\n` +

          `EXPERIMENT REPORTING RULE:\n` +
          `Every empirical result must come from the supplied experiment scorecards. Never create an accuracy, loss, F1, latency, memory, or other number that is not present in the actual execution records.\n\n` +

          writingStyleDirective +

          `Return pure LaTeX code only.`,
      },
    ]);

  let plagiarismResult: Record<
    string,
    unknown
  > = {};

  try {
    const apiKey =
      process.env.WINSTON_AI_API_KEY ||
      process.env.GOWINSTON_API_KEY;

    if (apiKey) {
      let cleanText =
        text
          .replace(
            /\\[a-zA-Z]+{[^}]*}/g,
            "",
          )
          .replace(
            /\\[a-zA-Z]+/g,
            "",
          )
          .replace(
            /[{}]/g,
            "",
          )
          .replace(
            /\s+/g,
            " ",
          )
          .trim();

      const words =
        cleanText.split(" ");

      if (words.length > 500) {
        cleanText =
          words
            .slice(0, 500)
            .join(" ");
      }

      const controller =
        new AbortController();

      const timeoutId =
        setTimeout(
          () =>
            controller.abort(),
          35_000,
        );

      try {
        const plagRes =
          await fetch(
            "https://api.gowinston.ai/v2/plagiarism",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                text: cleanText,
                language: "en",
              }),
              signal:
                controller.signal,
            },
          );

        if (plagRes.ok) {
          const plagJson =
            await plagRes.json();

          const result =
            plagJson.result ||
            {};

          plagiarismResult = {
            success: true,
            score:
              result.score ??
              plagJson.score ??
              0,
            sources:
              plagJson.sources ||
              result.sources ||
              [],
          };
        }
      } finally {
        clearTimeout(
          timeoutId,
        );
      }
    }
  } catch (error) {
    console.warn(
      "Plagiarism check skipped:",
      error,
    );
  }

  const artifact =
    await saveArtifact(
      db,
      userId,
      projectId,
      "paper",
      text,
      {
        template:
          project.latex_template,
        style:
          project.methodology_style,
        plagiarism:
          plagiarismResult as unknown as Json,
      },
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.paper,
    `Paper v${artifact.version} generated`,
    {
      actor:
        "writing-agent",
    },
  );

  await setStage(
    db,
    projectId,
    STAGE.memory,
  );

  return artifact;
}

/* -------------------------------------------------------------------------- */
/*                            PLAGIARISM CHECK                                */
/* -------------------------------------------------------------------------- */

export async function runPlagiarismCheckImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const {
    data: artifacts,
  } = await db
    .from("artifacts")
    .select("*")
    .eq(
      "project_id",
      projectId,
    )
    .eq(
      "kind",
      "paper",
    )
    .order("version", {
      ascending: false,
    })
    .limit(1);

  const paper =
    artifacts?.[0];

  if (!paper) {
    throw new Error(
      "Generate a paper first.",
    );
  }

  const apiKey =
    process.env.WINSTON_AI_API_KEY ||
    process.env.GOWINSTON_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GoWinston API key is not configured.",
    );
  }

  let cleanText =
    paper.content
      .replace(
        /\\[a-zA-Z]+{[^}]*}/g,
        "",
      )
      .replace(
        /\\[a-zA-Z]+/g,
        "",
      )
      .replace(
        /[{}]/g,
        "",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  const words =
    cleanText.split(" ");

  if (words.length > 500) {
    cleanText =
      words
        .slice(0, 500)
        .join(" ");
  }

  const plagRes =
    await fetch(
      "https://api.gowinston.ai/v2/plagiarism",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text: cleanText,
          language: "en",
        }),
      },
    );

  if (!plagRes.ok) {
    if (
      plagRes.status === 403
    ) {
      throw new Error(
        "GoWinston credit limit reached.",
      );
    }

    if (
      plagRes.status === 429
    ) {
      throw new Error(
        "GoWinston rate limit reached.",
      );
    }

    if (
      plagRes.status === 401
    ) {
      throw new Error(
        "GoWinston API key is invalid.",
      );
    }

    throw new Error(
      `Plagiarism service error (${plagRes.status})`,
    );
  }

  const plagJson =
    await plagRes.json();

  const result =
    plagJson.result ||
    {};

  const plagiarismResult = {
    success: true,
    score:
      result.score ??
      plagJson.score ??
      0,
    sources:
      plagJson.sources ||
      result.sources ||
      [],
    credits_remaining:
      plagJson.credits_remaining,
  };

  const existingMeta =
    typeof paper.meta ===
      "object" &&
    paper.meta !== null
      ? paper.meta
      : {};

  const meta = {
    ...existingMeta,
    plagiarism:
      plagiarismResult,
  };

  await db
    .from("artifacts")
    .update({ meta })
    .eq(
      "id",
      paper.id,
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.paper,
    "GoWinston AI Plagiarism scan complete",
    {
      actor:
        "plagiarism-checker",
    },
  );

  return plagiarismResult;
}

/* -------------------------------------------------------------------------- */
/*                                MEMORY                                      */
/* -------------------------------------------------------------------------- */

export async function distillMemoryImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const project =
    await loadProject(
      db,
      projectId,
    );

  const {
    data: versions,
  } = await db
    .from(
      "experiment_versions",
    )
    .select(
      "version,label,config,metrics,score,verdict,rolled_back",
    )
    .eq(
      "project_id",
      projectId,
    );

  const {
    data: idea,
  } = await db
    .from("ideas")
    .select(
      "title,summary",
    )
    .eq(
      "project_id",
      projectId,
    )
    .eq(
      "selected",
      true,
    )
    .maybeSingle();

  const out =
    await askJson<{
      title: string;
      summary: string;
      lesson: string;
    }>(
      [
        {
          role: "system",
          content:
            FIREWALL_SYSTEM,
        },
        {
          role: "user",
          content:
            "Distil this completed run into one durable strategic memory for future research direction. Be specific about what worked and what to avoid.\n\n" +
            `Prompt: ${project.prompt}\n` +
            `Idea: ${JSON.stringify(
              idea,
            )}\n` +
            `Versions: ${JSON.stringify(
              versions ?? [],
            )}\n\n` +
            'Return JSON {"title":"short","summary":"2-3 sentences","lesson":"one actionable rule"}.',
        },
      ],
      {
        title:
          project.title,
        summary: "",
        lesson: "",
      },
    );

  await db
    .from("memory_entries")
    .insert({
      user_id: userId,
      project_id:
        projectId,
      title: (
        out.title ||
        project.title
      ).slice(0, 160),
      summary:
        out.summary ?? "",
      lesson:
        out.lesson ?? "",
      weight: 1.0,
    });

  const {
    data: olds,
  } = await db
    .from("memory_entries")
    .select(
      "id,weight",
    )
    .eq(
      "user_id",
      userId,
    )
    .neq(
      "project_id",
      projectId,
    );

  let expired = 0;

  for (const m of olds ?? []) {
    const next =
      Number(m.weight) *
      0.85;

    if (next < 0.2) {
      await db
        .from(
          "memory_entries",
        )
        .delete()
        .eq(
          "id",
          m.id,
        );

      expired++;
    } else {
      await db
        .from(
          "memory_entries",
        )
        .update({
          weight: next,
        })
        .eq(
          "id",
          m.id,
        );
    }
  }

<<<<<<< HEAD
  await log(db, userId, projectId, STAGE.memory, `Memory distilled; ${expired} stale entries expired`, {
    actor: "memory-agent",
  });
  await db.from("projects").update({ status: "complete", stage: STAGE.memory }).eq("id", projectId);
  return { expired };
}

/* --------------------------------- 16 ---------------------------------- */

export async function theoryImpl(db: DB, userId: string, projectId: string) {
  const project = await loadProject(db, projectId);
  const { data: sources } = await db
    .from("sources")
    .select("title,abstract,year")
    .eq("project_id", projectId)
    .order("relevance", { ascending: false })
    .limit(10);
  if (!sources?.length) throw new Error("Run the research phase first.");

  const corpus = sources.map((s: any) => wrapUntrusted(s.title, (s.abstract ?? "").slice(0, 1200))).join("\n\n");

  const out = await askJson<{
    theorems: Array<{ statement: string; sketch: string; assumptions: string }>;
    analysis: string;
    lab_required: Array<{ claim: string; reason: string }>;
    agent_only: string[];
  }>(
    [
      { role: "system", content: FIREWALL_SYSTEM },
      {
        role: "user",
        content:
          `Non-programming branch. Prompt: ${project.prompt}\n\nUntrusted evidence:\n${corpus}\n\n` +
          'Return JSON {"theorems": [{statement, sketch, assumptions} x2-3], "analysis": experimental analysis without code (3 paragraphs), ' +
          '"lab_required": [{claim, reason}] for claims needing physical lab work, "agent_only": string[] of claims resolvable by reasoning alone}.',
      },
    ],
    { theorems: [], analysis: "", lab_required: [], agent_only: [] },
=======
  await log(
    db,
    userId,
    projectId,
    STAGE.memory,
    `Memory distilled; ${expired} stale entries expired`,
    {
      actor:
        "memory-agent",
    },
>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
  );

  await db
    .from("projects")
    .update({
      status: "complete",
      stage: STAGE.memory,
    })
    .eq(
      "id",
      projectId,
    );

  return {
    expired,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  THEORY                                    */
/* -------------------------------------------------------------------------- */

export async function theoryImpl(
  db: DB,
  userId: string,
  projectId: string,
) {
  const project =
    await loadProject(
      db,
      projectId,
    );

  const {
    data: sources,
  } = await db
    .from("sources")
    .select(
      "title,abstract,year",
    )
    .eq(
      "project_id",
      projectId,
    )
    .order("relevance", {
      ascending: false,
    })
    .limit(10);

  if (!sources?.length) {
    throw new Error(
      "Run the research phase first.",
    );
  }

  const corpus =
    sources
      .map((s) =>
        wrapUntrusted(
          s.title,
          (
            s.abstract ??
            ""
          ).slice(
            0,
            1200,
          ),
        ),
      )
      .join("\n\n");

  const out =
    await askJson<{
      theorems: Array<{
        statement: string;
        sketch: string;
        assumptions: string;
      }>;
      analysis: string;
      lab_required: Array<{
        claim: string;
        reason: string;
      }>;
      agent_only: string[];
    }>(
      [
        {
          role: "system",
          content:
            FIREWALL_SYSTEM,
        },
        {
          role: "user",
          content:
            `Non-programming branch. Prompt: ${project.prompt}\n\n` +
            `Untrusted evidence:\n${corpus}\n\n` +
            'Return JSON {"theorems":[{"statement","sketch","assumptions"}], "analysis":"...", "lab_required":[{"claim","reason"}], "agent_only":["..."]}.',
        },
      ],
      {
        theorems: [],
        analysis: "",
        lab_required: [],
        agent_only: [],
      },
    );

  const content = [
    ...(out.theorems ??
      []
    ).map(
      (t, i) =>
        `### Theorem ${i + 1}\n**Statement.** ${t.statement}\n\n**Proof sketch.** ${t.sketch}\n\n**Assumptions.** ${t.assumptions}`,
    ),
    `### Experimental analysis (no code)\n${
      out.analysis ?? ""
    }`,
  ].join("\n\n");

  const artifact =
    await saveArtifact(
      db,
      userId,
      projectId,
      "theory",
      content,
      {
        lab_required:
          (out.lab_required ??
            []) as unknown as Json,
        agent_only:
          (out.agent_only ??
            []) as unknown as Json,
      },
    );

  await log(
    db,
    userId,
    projectId,
    STAGE.theory,
    "Theory branch: theorems and analysis produced",
    {
      actor:
        "theory-agent",
      detail: {
        lab_items:
          (
            out.lab_required ??
            []
          ).length,
      },
    },
  );

  return artifact;
}

/* -------------------------------------------------------------------------- */
/*                            PIPELINE ROUTER                                 */
/* -------------------------------------------------------------------------- */

export async function handlePipelineAction(
  payload: any,
  req?: any,
) {
  const {
    supabase,
    userId,
  } =
    await getAuthenticatedContext(
      req,
    );

  const action =
    payload?.action;

  const data =
    payload?.data as any;

  switch (action) {
    case "createRun":
      return createRunImpl(
        supabase,
        userId,
        data,
      );

    case "research":
      return runResearchImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "ideas":
      return surfaceIdeasImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "select":
      return selectIdeaImpl(
        supabase,
        userId,
        data,
      );

    case "ideaGraph":
<<<<<<< HEAD
      return generateIdeaGraphForProjectImpl(supabase, userId, data.projectId);
=======
      return generateIdeaGraphImpl(
        supabase,
        userId,
        data.projectId,
      );

>>>>>>> 2bc06224f2ffdc5a9c9341499537497acfe07790
    case "formulate":
      return formulateImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "pseudocode":
      return pseudocodeImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "code":
      return codeImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "review":
      return reviewArtifactImpl(
        supabase,
        userId,
        data,
      );

    case "execute":
      return executeImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "pollExecute":
      return pollExecuteImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "rerun":
      return rerunImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "propose":
      return architectureProposalImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "decide":
      return architectureDecisionImpl(
        supabase,
        userId,
        data,
      );

    case "paper":
      return paperImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "plagiarism":
      return runPlagiarismCheckImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "memory":
      return distillMemoryImpl(
        supabase,
        userId,
        data.projectId,
      );

    case "theory":
      return theoryImpl(
        supabase,
        userId,
        data.projectId,
      );

    default:
      throw new Error(
        `Unknown pipeline action: ${action}`,
      );
  }
}

export {
  scanForInjection,
  generateIdeaGraphImpl,
};

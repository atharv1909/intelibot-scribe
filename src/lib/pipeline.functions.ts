import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  architectureDecisionImpl,
  architectureProposalImpl,
  codeImpl,
  createRunImpl,
  distillMemoryImpl,
  executeImpl,
  formulateImpl,
  paperImpl,
  pseudocodeImpl,
  rerunImpl,
  reviewArtifactImpl,
  runPlagiarismCheckImpl,
  runResearchImpl,
  selectIdeaImpl,
  surfaceIdeasImpl,
  theoryImpl,
} from "./pipeline.server";
import { generateIdeaGraphImpl } from "./idea-graph.server";
import {
  supervisorAssessHealth,
  supervisorAutoAdvance,
} from "./supervisor.server";

const projectInput = z.object({ projectId: z.string().uuid() });

export const createRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        prompt: z.string().min(3).max(4000),
        mode: z.enum(["vague", "detailed"]),
        methodology_style: z.enum(["defensive", "vague", "assertive", "replication"]),
        latex_template: z.enum(["neurips", "ieee", "acl", "elsevier"]),
        writing_style: z.string().max(20000).optional(),
      })
      .parse(d),
  )
  .handler(({ data, context }) => createRunImpl(context.supabase, context.userId, data));

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => runResearchImpl(context.supabase, context.userId, data.projectId));

export const surfaceIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => surfaceIdeasImpl(context.supabase, context.userId, data.projectId));

export const selectIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        ideaId: z.string().uuid().optional(),
        title: z.string().max(300).optional(),
        summary: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(({ data, context }) => selectIdeaImpl(context.supabase, context.userId, data));

export const formulateIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => formulateImpl(context.supabase, context.userId, data.projectId));

export const generatePseudocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => pseudocodeImpl(context.supabase, context.userId, data.projectId));

export const generateIdeaGraph = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => generateIdeaGraphImpl(context.supabase, context.userId, data.projectId));

export const generateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => codeImpl(context.supabase, context.userId, data.projectId));

export const reviewArtifact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        artifactId: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        notes: z.string().max(4000).optional(),
        content: z.string().max(200000).optional(),
      })
      .parse(d),
  )
  .handler(({ data, context }) => reviewArtifactImpl(context.supabase, context.userId, data));

export const executeRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => executeImpl(context.supabase, context.userId, data.projectId));

export const rerunExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => rerunImpl(context.supabase, context.userId, data.projectId));

export const proposeArchitectureChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => architectureProposalImpl(context.supabase, context.userId, data.projectId));

export const decideArchitectureChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ projectId: z.string().uuid(), approved: z.boolean(), change: z.string().max(4000) })
      .parse(d),
  )
  .handler(({ data, context }) => architectureDecisionImpl(context.supabase, context.userId, data));

export const generatePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => paperImpl(context.supabase, context.userId, data.projectId));

export const runPlagiarismCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => runPlagiarismCheckImpl(context.supabase, context.userId, data.projectId));

export const distillMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => distillMemoryImpl(context.supabase, context.userId, data.projectId));

export const runTheoryBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => theoryImpl(context.supabase, context.userId, data.projectId));

export const getSupervisorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => supervisorAssessHealth(context.supabase, context.userId, data.projectId));

export const triggerSupervisorAdvance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(({ data, context }) => supervisorAutoAdvance(context.supabase, context.userId, data.projectId));
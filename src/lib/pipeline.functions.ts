import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .handler(async ({ data, context }) => {
    const { createRunImpl } = await import("./pipeline.server");
    return createRunImpl(context.supabase, context.userId, data);
  });

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { runResearchImpl } = await import("./pipeline.server");
    return runResearchImpl(context.supabase, context.userId, data.projectId);
  });

export const surfaceIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { surfaceIdeasImpl } = await import("./pipeline.server");
    return surfaceIdeasImpl(context.supabase, context.userId, data.projectId);
  });

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
  .handler(async ({ data, context }) => {
    const { selectIdeaImpl } = await import("./pipeline.server");
    return selectIdeaImpl(context.supabase, context.userId, data);
  });

export const formulateIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { formulateImpl } = await import("./pipeline.server");
    return formulateImpl(context.supabase, context.userId, data.projectId);
  });

export const generatePseudocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { pseudocodeImpl } = await import("./pipeline.server");
    return pseudocodeImpl(context.supabase, context.userId, data.projectId);
  });

export const generateIdeaGraph = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { generateIdeaGraphImpl } = await import("./idea-graph.server");
    return generateIdeaGraphImpl(context.supabase, context.userId, data.projectId);
  });

export const generateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { codeImpl } = await import("./pipeline.server");
    return codeImpl(context.supabase, context.userId, data.projectId);
  });

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
  .handler(async ({ data, context }) => {
    const { reviewArtifactImpl } = await import("./pipeline.server");
    return reviewArtifactImpl(context.supabase, context.userId, data);
  });

export const executeRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { executeImpl } = await import("./pipeline.server");
    return executeImpl(context.supabase, context.userId, data.projectId);
  });

export const rerunExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { rerunImpl } = await import("./pipeline.server");
    return rerunImpl(context.supabase, context.userId, data.projectId);
  });

export const proposeArchitectureChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { architectureProposalImpl } = await import("./pipeline.server");
    return architectureProposalImpl(context.supabase, context.userId, data.projectId);
  });

export const decideArchitectureChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ projectId: z.string().uuid(), approved: z.boolean(), change: z.string().max(4000) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { architectureDecisionImpl } = await import("./pipeline.server");
    return architectureDecisionImpl(context.supabase, context.userId, data);
  });

export const generatePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { paperImpl } = await import("./pipeline.server");
    return paperImpl(context.supabase, context.userId, data.projectId);
  });

export const runPlagiarismCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { runPlagiarismCheckImpl } = await import("./pipeline.server");
    return runPlagiarismCheckImpl(context.supabase, context.userId, data.projectId);
  });

export const distillMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { distillMemoryImpl } = await import("./pipeline.server");
    return distillMemoryImpl(context.supabase, context.userId, data.projectId);
  });

export const runTheoryBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { theoryImpl } = await import("./pipeline.server");
    return theoryImpl(context.supabase, context.userId, data.projectId);
  });

export const getSupervisorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supervisorAssessHealth } = await import("./supervisor.server");
    return supervisorAssessHealth(context.supabase, context.userId, data.projectId);
  });

export const triggerSupervisorAdvance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supervisorAutoAdvance } = await import("./supervisor.server");
    return supervisorAutoAdvance(context.supabase, context.userId, data.projectId);
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const projectInput = z.object({ projectId: z.string().uuid() });

async function getAuth() {
  const { getAuthenticatedContext } = await import("@/integrations/supabase/auth-middleware");
  return getAuthenticatedContext();
}

export const createRun = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { createRunImpl } = await import("./pipeline.server");
    return createRunImpl(supabase, userId, data);
  });

export const runResearch = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { runResearchImpl } = await import("./pipeline.server");
    return runResearchImpl(supabase, userId, data.projectId);
  });

export const surfaceIdeas = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { surfaceIdeasImpl } = await import("./pipeline.server");
    return surfaceIdeasImpl(supabase, userId, data.projectId);
  });

export const selectIdea = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { selectIdeaImpl } = await import("./pipeline.server");
    return selectIdeaImpl(supabase, userId, data);
  });

export const formulateIdea = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { formulateImpl } = await import("./pipeline.server");
    return formulateImpl(supabase, userId, data.projectId);
  });

export const generatePseudocode = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { pseudocodeImpl } = await import("./pipeline.server");
    return pseudocodeImpl(supabase, userId, data.projectId);
  });

export const generateIdeaGraph = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { generateIdeaGraphImpl } = await import("./idea-graph.server");
    return generateIdeaGraphImpl(supabase, userId, data.projectId);
  });

export const generateCode = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { codeImpl } = await import("./pipeline.server");
    return codeImpl(supabase, userId, data.projectId);
  });

export const reviewArtifact = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { reviewArtifactImpl } = await import("./pipeline.server");
    return reviewArtifactImpl(supabase, userId, data);
  });

export const executeRun = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { executeImpl } = await import("./pipeline.server");
    return executeImpl(supabase, userId, data.projectId);
  });

export const rerunExperiment = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { rerunImpl } = await import("./pipeline.server");
    return rerunImpl(supabase, userId, data.projectId);
  });

export const proposeArchitectureChange = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { architectureProposalImpl } = await import("./pipeline.server");
    return architectureProposalImpl(supabase, userId, data.projectId);
  });

export const decideArchitectureChange = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({ projectId: z.string().uuid(), approved: z.boolean(), change: z.string().max(4000) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { architectureDecisionImpl } = await import("./pipeline.server");
    return architectureDecisionImpl(supabase, userId, data);
  });

export const generatePaper = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { paperImpl } = await import("./pipeline.server");
    return paperImpl(supabase, userId, data.projectId);
  });

export const runPlagiarismCheck = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { runPlagiarismCheckImpl } = await import("./pipeline.server");
    return runPlagiarismCheckImpl(supabase, userId, data.projectId);
  });

export const distillMemory = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { distillMemoryImpl } = await import("./pipeline.server");
    return distillMemoryImpl(supabase, userId, data.projectId);
  });

export const runTheoryBranch = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { theoryImpl } = await import("./pipeline.server");
    return theoryImpl(supabase, userId, data.projectId);
  });

export const getSupervisorStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { supervisorAssessHealth } = await import("./supervisor.server");
    return supervisorAssessHealth(supabase, userId, data.projectId);
  });

export const triggerSupervisorAdvance = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();
    const { supervisorAutoAdvance } = await import("./supervisor.server");
    return supervisorAutoAdvance(supabase, userId, data.projectId);
  });
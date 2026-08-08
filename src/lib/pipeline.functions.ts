import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function getAuth() {
  const { getAuthenticatedContext } = await import("@/integrations/supabase/auth-middleware");
  return getAuthenticatedContext();
}

export const runPipeline = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        action: z.string(),
        data: z.record(z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabase, userId } = await getAuth();

    const action = data.action;
    const payload = data.data as any;

    let result: any = null;
    switch (action) {
      case "createRun": {
        const { createRunImpl } = await import("./pipeline.server");
        result = await createRunImpl(supabase, userId, payload);
        break;
      }
      case "research": {
        const { runResearchImpl } = await import("./pipeline.server");
        result = await runResearchImpl(supabase, userId, payload.projectId);
        break;
      }
      case "ideas": {
        const { surfaceIdeasImpl } = await import("./pipeline.server");
        result = await surfaceIdeasImpl(supabase, userId, payload.projectId);
        break;
      }
      case "select": {
        const { selectIdeaImpl } = await import("./pipeline.server");
        result = await selectIdeaImpl(supabase, userId, payload);
        break;
      }
      case "ideaGraph": {
        const { generateIdeaGraphImpl } = await import("./idea-graph.server");
        result = await generateIdeaGraphImpl(supabase, userId, payload.projectId);
        break;
      }
      case "formulate": {
        const { formulateImpl } = await import("./pipeline.server");
        result = await formulateImpl(supabase, userId, payload.projectId);
        break;
      }
      case "pseudocode": {
        const { pseudocodeImpl } = await import("./pipeline.server");
        result = await pseudocodeImpl(supabase, userId, payload.projectId);
        break;
      }
      case "code": {
        const { codeImpl } = await import("./pipeline.server");
        result = await codeImpl(supabase, userId, payload.projectId);
        break;
      }
      case "review": {
        const { reviewArtifactImpl } = await import("./pipeline.server");
        result = await reviewArtifactImpl(supabase, userId, payload);
        break;
      }
      case "execute": {
        const { executeImpl } = await import("./pipeline.server");
        result = await executeImpl(supabase, userId, payload.projectId);
        break;
      }
      case "rerun": {
        const { rerunImpl } = await import("./pipeline.server");
        result = await rerunImpl(supabase, userId, payload.projectId);
        break;
      }
      case "propose": {
        const { architectureProposalImpl } = await import("./pipeline.server");
        result = await architectureProposalImpl(supabase, userId, payload.projectId);
        break;
      }
      case "decide": {
        const { architectureDecisionImpl } = await import("./pipeline.server");
        result = await architectureDecisionImpl(supabase, userId, payload);
        break;
      }
      case "paper": {
        const { paperImpl } = await import("./pipeline.server");
        result = await paperImpl(supabase, userId, payload.projectId);
        break;
      }
      case "plagiarism": {
        const { runPlagiarismCheckImpl } = await import("./pipeline.server");
        result = await runPlagiarismCheckImpl(supabase, userId, payload.projectId);
        break;
      }
      case "memory": {
        const { distillMemoryImpl } = await import("./pipeline.server");
        result = await distillMemoryImpl(supabase, userId, payload.projectId);
        break;
      }
      case "theory": {
        const { theoryImpl } = await import("./pipeline.server");
        result = await theoryImpl(supabase, userId, payload.projectId);
        break;
      }
      case "supervisorStatus": {
        const { supervisorAssessHealth } = await import("./supervisor.server");
        result = await supervisorAssessHealth(supabase, userId, payload.projectId);
        break;
      }
      case "supervisorAdvance": {
        const { supervisorAutoAdvance } = await import("./supervisor.server");
        result = await supervisorAutoAdvance(supabase, userId, payload.projectId);
        break;
      }
      default:
        throw new Error(`Unknown pipeline action: ${action}`);
    }
    return result;
  });
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getAuthenticatedContextFromRequest } from "@/integrations/supabase/auth-middleware";
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
} from "@/lib/pipeline.server";
import { generateIdeaGraphImpl } from "@/lib/idea-graph.server";
import { supervisorAssessHealth, supervisorAutoAdvance } from "@/lib/supervisor.server";

export const APIRoute = createAPIFileRoute("/api/pipeline")({
  POST: async ({ request }) => {
    try {
      const { supabase, userId } = await getAuthenticatedContextFromRequest(request);
      const body = await request.json();
      const action = body.action;

      let result: any = null;

      switch (action) {
        case "createRun":
          result = await createRunImpl(supabase, userId, body);
          break;
        case "research":
          result = await runResearchImpl(supabase, userId, body.projectId);
          break;
        case "ideas":
          result = await surfaceIdeasImpl(supabase, userId, body.projectId);
          break;
        case "select":
          result = await selectIdeaImpl(supabase, userId, body);
          break;
        case "ideaGraph":
          result = await generateIdeaGraphImpl(supabase, userId, body.projectId);
          break;
        case "formulate":
          result = await formulateImpl(supabase, userId, body.projectId);
          break;
        case "pseudocode":
          result = await pseudocodeImpl(supabase, userId, body.projectId);
          break;
        case "code":
          result = await codeImpl(supabase, userId, body.projectId);
          break;
        case "review":
          result = await reviewArtifactImpl(supabase, userId, body);
          break;
        case "execute":
          result = await executeImpl(supabase, userId, body.projectId);
          break;
        case "rerun":
          result = await rerunImpl(supabase, userId, body.projectId);
          break;
        case "propose":
          result = await architectureProposalImpl(supabase, userId, body.projectId);
          break;
        case "decide":
          result = await architectureDecisionImpl(supabase, userId, body);
          break;
        case "paper":
          result = await paperImpl(supabase, userId, body.projectId);
          break;
        case "plagiarism":
          result = await runPlagiarismCheckImpl(supabase, userId, body.projectId);
          break;
        case "memory":
          result = await distillMemoryImpl(supabase, userId, body.projectId);
          break;
        case "theory":
          result = await theoryImpl(supabase, userId, body.projectId);
          break;
        case "supervisorStatus":
          result = await supervisorAssessHealth(supabase, userId, body.projectId);
          break;
        case "supervisorAdvance":
          result = await supervisorAutoAdvance(supabase, userId, body.projectId);
          break;
        default:
          return new Response(JSON.stringify({ error: `Unknown pipeline action: ${action}` }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
      }

      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Pipeline API error:", err);
      return new Response(JSON.stringify({ error: err?.message || "Internal pipeline error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});

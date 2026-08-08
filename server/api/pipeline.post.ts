import { defineEventHandler, readBody, getHeader, createError } from "h3";
import { handlePipelineAction } from "../../api/lib/pipeline.server";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const result = await handlePipelineAction(body);
    return { ok: true, result };
  } catch (err: any) {
    console.error("Pipeline Nitro API error:", err);
    return createError({
      statusCode: 500,
      statusMessage: err?.message || "Pipeline execution failed",
    });
  }
});

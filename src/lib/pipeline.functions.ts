import { createServerFn } from "@tanstack/react-start";

export const runPipeline = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { handlePipelineAction } = await import("./pipeline.server");
  return handlePipelineAction(ctx?.data);
});
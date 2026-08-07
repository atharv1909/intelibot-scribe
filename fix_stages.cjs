const fs = require('fs');
const file = 'src/routes/_authenticated/runs.$id.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update STAGES array in src/components/pipeline/stages.ts
const stagesFile = 'src/components/pipeline/stages.ts';
let stagesContent = fs.readFileSync(stagesFile, 'utf8');
stagesContent = stagesContent.replace(
  '{ name: "Formulation", blurb: "Drafted against the literature, with a concept lineage." },',
  '{ name: "Idea Graph", blurb: "Visualise ideas and references in a 2D positioning map." },\n  { name: "Formulation", blurb: "Drafted against the literature, with a concept lineage." },'
);
fs.writeFileSync(stagesFile, stagesContent);

// Add imports
content = content.replace(
  'import { STAGES } from "@/components/pipeline/stages";',
  'import { STAGES } from "@/components/pipeline/stages";\nimport { IdeaGraphCanvas } from "@/components/pipeline/IdeaGraphCanvas";'
);
content = content.replace(
  'generateCode,\n  generatePaper,',
  'generateCode,\n  generateIdeaGraph,\n  generatePaper,'
);

// Add to call object
content = content.replace(
  'pseudocode: useServerFn(generatePseudocode),',
  'graph: useServerFn(generateIdeaGraph),\n    pseudocode: useServerFn(generatePseudocode),'
);

// Add graph fetching
content = content.replace(
  'const draft = latest("draft");',
  'const graph = latest("idea_graph");\n  const draft = latest("draft");'
);

// Now shift the numbers in the UI
for (let i = 14; i >= 5; i--) {
  const next = i + 1;
  content = content.replace(new RegExp(`{\\/\\* ${i}(.*?) \\*\\/}`, "g"), `{/* ${next}$1 */}`);
  content = content.replace(new RegExp(`StageCard(.*?)index={${i}}(.*?)\\.\\.\\.stageProps\\(${i}\\)(.*?)project\\.stage === ${i}`, "g"), `StageCard$1index={${next}}$2...stageProps(${next})$3project.stage === ${next}`);
  // Also shift ReviewStage indices
  content = content.replace(new RegExp(`ReviewStage\\s+index={${i}}\\s+artifact={(.*?)}\\s+active={project\\.stage === ${i}}`, "g"), `ReviewStage\n          index={${next}}\n          artifact={$1}\n          active={project.stage === ${next}}`);
  // And stage anchors
  content = content.replace(new RegExp(`href={\\\`#stage-${i}\\\`}`, "g"), `href={\`#stage-${next}\`}`);
}

// And finally insert the new Stage 5
const stage5Str = `        {/* 5 — Idea Graph */}
        <StageCard
          index={5}
          {...stageProps(5)}
          active={project.stage === 5}
          actions={
            <Button
              disabled={pending === "graph" || !selected}
              onClick={() => run("graph", () => call.graph({ data: { projectId: id } }), "Idea graph generated")}
            >
              {pending === "graph" ? "Generating..." : graph ? "Regenerate Graph" : "Generate Idea Graph"}
            </Button>
          }
        >
          {!graph ? (
            <Empty>No idea graph generated yet.</Empty>
          ) : (
            <div className="h-[500px] w-full rounded-md border border-border bg-muted/20">
              <IdeaGraphCanvas
                nodesData={(graph.meta as any)?.nodes || []}
                edgesData={(graph.meta as any)?.edges || []}
              />
            </div>
          )}
        </StageCard>

`;

content = content.replace('{/* 6 — Formulation */}', stage5Str + '        {/* 6 — Formulation */}');

fs.writeFileSync(file, content);
console.log("Updated runs.$id.tsx and stages.ts successfully!");

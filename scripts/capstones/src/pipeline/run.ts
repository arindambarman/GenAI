#!/usr/bin/env node
import { env } from "../shared/env.js";
import { runPipeline } from "./orchestrator.js";
import { defaultStages } from "./stages.js";
import { PipelineConfigSchema, newPipelineState, type PipelineConfig } from "./schema.js";
import { installPipelineMock } from "./mock.js";

const HELP = `pipeline — chain all 4 capstone agents into a self-improvement loop

The default pipeline:
  1. learn          → extract concepts from the course (Learner Agent)
  2. populate-kb    → seed Knowledge Agent's KB with top concepts
  3. brainstorm     → propose missing topics (Brainstorm Agent)
  4. research       → ground each topic in literature (Research Agent)
  5. synthesise     → compose draft lesson proposals (deterministic)

Usage:
  pnpm --filter @adaptlearn/capstones pipeline [options]

Options:
  --modules <ids>           Limit learner stage to these modules (e.g. "01,04,09")
  --use-cached-learner <p>  Skip learner stage; load concepts from path
  --num-topics <N>          Number of topics to propose (default 5)
  --no-research             Skip per-topic research stage
  --out <dir>               Output directory (default: pipeline-output)

Examples:
  # Mock mode quick demo
  CAPSTONE_MOCK=true pnpm --filter @adaptlearn/capstones pipeline

  # Real run on subset, skip research (cheaper)
  pnpm --filter @adaptlearn/capstones pipeline -- --modules 01,04 --no-research

  # Reuse previous learner output
  pnpm --filter @adaptlearn/capstones pipeline -- \\
    --use-cached-learner learner-output-preview-m02/concepts.json
`;

function parseArgs(argv: string[]): Partial<PipelineConfig> {
  const partial: Partial<PipelineConfig> = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--modules" && next) { partial.modules = next.split(","); i++; }
    else if (arg === "--use-cached-learner" && next) { partial.useCachedLearner = next; i++; }
    else if (arg === "--num-topics" && next) { partial.numProposedTopics = Number(next); i++; }
    else if (arg === "--no-research") { partial.researchPerTopic = false; }
    else if (arg === "--out" && next) { partial.outputDir = next; i++; }
  }
  return partial;
}

async function main(): Promise<void> {
  const args = process.argv;
  if (args.includes("help") || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const config = PipelineConfigSchema.parse(parseArgs(args));

  if (env.isMockMode) {
    console.log("ℹ️  MOCK MODE (set ANTHROPIC_API_KEY for real LLM)");
    installPipelineMock();
  } else {
    console.log(`ℹ️  Using model ${env.model}`);
    console.log("⚠️  Real-LLM mode estimated cost: $1-5 depending on options (use --no-research and --modules to limit)");
  }

  console.log(`\n🎯 Goal: ${config.goal}`);
  console.log(`📁 Output: ${config.outputDir}/\n`);
  console.log("─".repeat(72));

  const state = newPipelineState(config);
  const stages = defaultStages(config);

  const finalState = await runPipeline({
    state,
    stages,
    onStageStart: (stage, idx, total) => {
      console.log(`\n[${idx + 1}/${total}] 🚀 ${stage.name} — ${stage.description}`);
    },
    onStageEnd: (_stage, result) => {
      if (result.ok && result.note) {
        console.log(`        ⏭  ${result.note}`);
      } else if (result.ok) {
        console.log(`        ✓ ${(result.durationMs / 1000).toFixed(1)}s · $${result.cost.toFixed(4)} · ${result.llmCalls} LLM calls`);
      } else {
        console.log(`        ✗ failed: ${result.error}`);
      }
    },
    onProgress: (_stage, message) => {
      console.log(`        · ${message}`);
    },
  });

  // Final report
  console.log("\n" + "─".repeat(72));
  console.log("\n📊 PIPELINE COMPLETE\n");
  console.log(`Total: ${((Date.now() - finalState.startedAt) / 1000).toFixed(1)}s · $${finalState.totalCost.toFixed(4)} · ${finalState.totalLLMCalls} LLM calls`);
  console.log();
  console.log(`Outputs:`);
  console.log(`  Concepts extracted:        ${finalState.learner_concepts.length}`);
  console.log(`  KB notes created:          ${finalState.kb_notes_created.length}`);
  console.log(`  Topics proposed:           ${finalState.proposed_topics.length}`);
  console.log(`  Topics grounded:           ${finalState.research_grounded.filter((g) => g.faithfulness_score > 0).length}/${finalState.research_grounded.length}`);
  console.log(`  Draft proposals composed:  ${finalState.draft_proposals.length}`);
  console.log();
  console.log(`📦 See ${config.outputDir}/summary.md for full report.`);
  console.log(`📦 See ${config.outputDir}/proposals/ for individual draft lessons.`);

  if (finalState.draft_proposals.length > 0) {
    console.log("\n🎓 TOP PROPOSED EXTENSIONS:\n");
    for (let i = 0; i < Math.min(3, finalState.draft_proposals.length); i++) {
      const p = finalState.draft_proposals[i];
      console.log(`  ${p.proposed_lesson_id} ${p.proposed_lesson_title}`);
      console.log(`    Insert: ${p.insertion_point}`);
      console.log(`    Why: ${p.rationale.slice(0, 100)}…`);
      console.log();
    }
  }
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error("\nFatal:", err.message);
    if (err.stack) console.error(err.stack);
  } else {
    console.error("\nFatal:", String(err));
  }
  process.exit(1);
});

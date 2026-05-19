#!/usr/bin/env node
import { env } from "../shared/env.js";
import { setMockHandler } from "../shared/llm.js";
import { printLatestSteps, resetProgressPrinter } from "../shared/trace.js";
import { runLearnerAgent } from "./agent.js";
import { learnerMockHandler } from "./mock.js";
import { LearnerInputSchema } from "./schema.js";

const HELP = `learner-agent — read the course, build a knowledge base

Usage:
  learner-agent [--modules <ids>] [--out <dir>]

Examples:
  pnpm --filter @adaptlearn/capstones learner
  pnpm --filter @adaptlearn/capstones learner -- --modules 01,02,04
  pnpm --filter @adaptlearn/capstones learner -- --out custom-output
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("help") || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const modulesFlag = args[args.indexOf("--modules") + 1];
  const outFlag = args[args.indexOf("--out") + 1];

  const modules = args.includes("--modules") && modulesFlag
    ? modulesFlag.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
    : undefined;
  const outputDir = args.includes("--out") && outFlag ? outFlag : "learner-output";

  if (env.isMockMode) {
    console.log("ℹ️  MOCK MODE (set ANTHROPIC_API_KEY for real LLM)\n");
    setMockHandler(learnerMockHandler);
  } else {
    console.log(`ℹ️  Using model ${env.model}\n`);
    console.log("⚠️  Real-LLM mode will read all 13 modules. Expect ~$1-3 cost and 3-10 minutes runtime.\n");
  }

  const input = LearnerInputSchema.parse({
    ...(modules && { modules }),
    outputDir,
  });

  console.log(`📚 Reading course → ${outputDir}/\n` + "─".repeat(60) + "\n📋 Live progress:\n");

  resetProgressPrinter();
  const result = await runLearnerAgent(input, printLatestSteps);

  console.log("\n" + "─".repeat(60));
  console.log(`\n📋 Summary: ${result.trace.totalLLMCalls} LLM calls · ${result.trace.totalToolCalls} tool calls · $${result.trace.totalCost.toFixed(4)}`);

  if (result.error) {
    console.error(`\n❌ ${result.error}`);
    process.exit(1);
  }

  if (result.report) {
    console.log("\n" + "─".repeat(60) + "\n🎓 LEARNER REPORT\n");
    console.log(`Modules processed: ${result.recordedState.modulesRead.length}`);
    console.log(`Concepts extracted: ${result.recordedState.concepts.length}`);
    console.log(`Relationships identified: ${result.recordedState.relationships.length}`);
    console.log(`Optimisations suggested: ${result.recordedState.optimizations.length}`);
    console.log(`Learning paths: ${result.report.learning_paths.length}`);
    console.log();

    console.log("## Key insights\n");
    for (const k of result.report.key_insights) console.log(`  • ${k}`);

    console.log("\n## Recommended learning paths\n");
    for (const p of result.report.learning_paths) {
      console.log(`### ${p.name} (~${p.estimated_hours}h)`);
      console.log(`Audience: ${p.audience}`);
      console.log(`${p.description}`);
      console.log(`Path: ${p.lesson_sequence.join(" → ")}\n`);
    }

    console.log("─".repeat(60));
    console.log("\n📦 Output files written:\n");
    for (const f of result.outputFiles) console.log(`  ${f}`);
    console.log(`\nOpen ${outputDir}/summary.md for the full report.\n`);
  }
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error("Fatal:", err.message);
    if (err.stack) console.error(err.stack);
  } else {
    console.error("Fatal:", String(err));
  }
  process.exit(1);
});

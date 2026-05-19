#!/usr/bin/env node
import { env } from "../shared/env.js";
import { setMockHandler } from "../shared/llm.js";
import { formatTrace, printLatestSteps, resetProgressPrinter } from "../shared/trace.js";
import { runBrainstormAgent } from "./agent.js";
import { brainstormMockHandler } from "./mock.js";
import { BrainstormQuerySchema } from "./schema.js";

const DEFAULT_TOPIC =
  "How can our team reduce customer-support response time without hiring more staff?";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const topic = args.find((a) => !a.startsWith("--")) ?? DEFAULT_TOPIC;

  if (env.isMockMode) {
    console.log("ℹ️  MOCK MODE (set ANTHROPIC_API_KEY for real LLM)\n");
    setMockHandler(brainstormMockHandler);
  } else {
    console.log(`ℹ️  Using model ${env.model}\n`);
  }

  const query = BrainstormQuerySchema.parse({
    topic,
    num_techniques: 4,
    ideas_per_technique: 4,
    constraints: [],
  });

  console.log(`💡 Topic: ${query.topic}\n` + "─".repeat(60));
  console.log("\n📋 Live progress (full trace at end):\n");

  resetProgressPrinter();
  const result = await runBrainstormAgent(query, printLatestSteps);

  console.log("\n" + "─".repeat(60));
  console.log(`\n📋 Final summary: ${result.trace.totalLLMCalls} LLM calls · ${result.trace.totalToolCalls} tool calls · $${result.trace.totalCost.toFixed(4)}`);
  if (process.env.CAPSTONE_VERBOSE === "true") {
    console.log("\nFull trace:");
    console.log(formatTrace(result.trace, { maxResultChars: 250 }));
  }
  console.log("\n" + "─".repeat(60));

  if (result.error) {
    console.error(`\n❌ ${result.error}`);
    process.exit(1);
  }

  if (result.report) {
    console.log("\n🎯 BRAINSTORMING REPORT\n");
    console.log(`Topic: ${result.report.topic}`);
    console.log(`Techniques used: ${result.techniquesUsed.join(", ")}`);
    console.log(`Ideas generated: ${result.report.ideas.length}`);
    console.log();

    console.log("## All ideas (with scores)");
    for (const idea of result.report.ideas) {
      const s = idea.scores;
      const weighted = (
        0.35 * s.impact + 0.30 * s.feasibility + 0.20 * s.novelty - 0.15 * s.cost
      ).toFixed(2);
      console.log(`\n  [${idea.id}] ${idea.title}  (weighted: ${weighted})`);
      console.log(`    technique: ${idea.technique}`);
      console.log(`    scores: novelty=${s.novelty}, feasibility=${s.feasibility}, impact=${s.impact}, cost=${s.cost}`);
      console.log(`    ${idea.description}`);
    }

    console.log("\n\n## TOP 3 — recommended next bets\n");
    for (let i = 0; i < result.report.top_three.length; i++) {
      const t = result.report.top_three[i];
      const idea = result.report.ideas.find((x) => x.id === t.id);
      console.log(`### ${i + 1}. [${t.id}] ${idea?.title ?? "(unknown)"}`);
      console.log(`Why: ${t.why_chosen}`);
      console.log(`Next steps:`);
      for (const step of t.next_steps) {
        console.log(`  → ${step}`);
      }
      console.log();
    }

    console.log("## Summary\n");
    console.log(result.report.summary);
  }

  console.log("\n" + "─".repeat(60));
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

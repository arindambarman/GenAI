#!/usr/bin/env node
import { env } from "../shared/env.js";
import { setMockHandler } from "../shared/llm.js";
import { formatTrace, printLatestSteps, resetProgressPrinter } from "../shared/trace.js";
import { runResearchAgent } from "./agent.js";
import { researchMockHandler } from "./mock.js";
import { ResearchQuerySchema } from "./schema.js";

const DEFAULT_QUESTION =
  "What are the main LLM-agent paradigms (ReAct, Reflexion, Plan-and-Solve) and how do they differ?";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const question = args.find((a) => !a.startsWith("--")) ?? DEFAULT_QUESTION;

  if (env.isMockMode) {
    console.log("ℹ️  MOCK MODE (set ANTHROPIC_API_KEY to use real LLM)\n");
    setMockHandler(researchMockHandler);
  } else {
    console.log(`ℹ️  Using model ${env.model}\n`);
  }

  const query = ResearchQuerySchema.parse({ question, minSources: 3, maxSources: 8 });

  console.log(`📚 Research question: ${query.question}\n`);
  console.log("─".repeat(60) + "\n");
  console.log("📋 Live progress:\n");

  resetProgressPrinter();
  const result = await runResearchAgent(query, printLatestSteps);

  console.log("\n" + "─".repeat(60));
  console.log(`\n📋 Summary: ${result.trace.totalLLMCalls} LLM calls · ${result.trace.totalToolCalls} tool calls · $${result.trace.totalCost.toFixed(4)}`);
  if (process.env.CAPSTONE_VERBOSE === "true") {
    console.log("\nFull trace:");
    console.log(formatTrace(result.trace, { maxResultChars: 300 }));
  }
  console.log("\n" + "─".repeat(60));

  if (result.error) {
    console.error(`\n❌ Error: ${result.error}`);
    process.exit(1);
  }

  if (result.synthesis) {
    console.log("\n📝 SYNTHESIS\n");
    console.log(result.synthesis.summary);
    console.log("\n## Key findings");
    for (const f of result.synthesis.key_findings) {
      console.log(`  • ${f}`);
    }
    console.log(`\n## Citations (${result.synthesis.citations.length})`);
    for (const c of result.synthesis.citations) {
      console.log(`  [${c.source_id}] ${c.title}`);
      console.log(`    supports: "${c.supports}"`);
      console.log(`    passage:  "${c.passage.slice(0, 100)}${c.passage.length > 100 ? "…" : ""}"`);
    }
    console.log(`\n## Confidence: ${(result.synthesis.confidence * 100).toFixed(0)}%`);
    if (result.synthesis.caveats.length > 0) {
      console.log("\n## Caveats");
      for (const c of result.synthesis.caveats) console.log(`  ⚠ ${c}`);
    }
  }

  if (result.faithfulness) {
    console.log("\n" + "─".repeat(60));
    console.log("\n✅ FAITHFULNESS AUDIT\n");
    console.log(
      `  ${result.faithfulness.supported}/${result.faithfulness.total_claims} citations verified (${(
        result.faithfulness.faithfulness_score * 100
      ).toFixed(0)}%)`,
    );
    if (result.faithfulness.unsupported_claims.length > 0) {
      console.log("\n  Unsupported claims:");
      for (const c of result.faithfulness.unsupported_claims) {
        console.log(`    ❌ "${c.claim}" — ${c.reason}`);
      }
    }
  }

  console.log("\n" + "─".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

#!/usr/bin/env node
import { env } from "../shared/env.js";
import { setMockHandler } from "../shared/llm.js";
import { formatTrace } from "../shared/trace.js";
import { addToKB, organizeKB, queryKB } from "./agent.js";
import { knowledgeMockHandler } from "./mock.js";

const HELP = `knowledge-agent — three modes for a personal knowledge base

Usage:
  knowledge-agent query <question>       # ask the KB a question
  knowledge-agent organize                # audit clusters, orphans, gaps
  knowledge-agent add <content>           # incorporate new content as note(s)
  knowledge-agent help

Examples:
  knowledge-agent query "How does attention work in transformers?"
  knowledge-agent organize
  knowledge-agent add "DPO is a closed-form alternative to RLHF..."
`;

async function main(): Promise<void> {
  const [mode, ...rest] = process.argv.slice(2);
  const input = rest.join(" ");

  if (!mode || mode === "help" || mode === "--help") {
    console.log(HELP);
    return;
  }

  if (env.isMockMode) {
    console.log("ℹ️  MOCK MODE (set ANTHROPIC_API_KEY for real LLM)\n");
    setMockHandler(knowledgeMockHandler);
  } else {
    console.log(`ℹ️  Using model ${env.model}\n`);
  }

  if (mode === "query") {
    if (!input) {
      console.error("query requires a question");
      process.exit(1);
    }
    console.log(`❓ Question: ${input}\n` + "─".repeat(60));
    const r = await queryKB(input);
    console.log("\n📋 TRACE\n");
    console.log(formatTrace(r.trace, { maxResultChars: 200 }));
    if (r.error) {
      console.error(`\n❌ ${r.error}`);
      process.exit(1);
    }
    if (r.answer) {
      console.log("\n" + "─".repeat(60) + "\n💡 ANSWER\n");
      console.log(r.answer.answer);
      console.log(`\n## Citations (${r.answer.citations.length})`);
      for (const c of r.answer.citations) {
        console.log(`  [${c.note_id}] ${c.note_title}`);
        console.log(`    supports: ${c.supports}`);
      }
      if (r.answer.related_notes.length > 0) {
        console.log(`\n## Related notes: ${r.answer.related_notes.join(", ")}`);
      }
      if (r.answer.gaps.length > 0) {
        console.log(`\n## Gaps in KB:`);
        for (const g of r.answer.gaps) console.log(`  ⚠ ${g}`);
      }
      console.log(`\n## Confidence: ${(r.answer.confidence * 100).toFixed(0)}%`);
    }
  } else if (mode === "organize") {
    console.log("🗂️  Auditing knowledge base...\n" + "─".repeat(60));
    const r = await organizeKB();
    console.log("\n📋 TRACE\n");
    console.log(formatTrace(r.trace, { maxResultChars: 200 }));
    if (r.error) {
      console.error(`\n❌ ${r.error}`);
      process.exit(1);
    }
    if (r.report) {
      console.log("\n" + "─".repeat(60) + "\n📊 REPORT\n");
      console.log(`Total notes: ${r.report.total_notes}\n`);
      console.log(`## Clusters (${r.report.clusters.length})`);
      for (const c of r.report.clusters) {
        console.log(`  • ${c.theme} (${c.note_ids.length} notes)`);
        console.log(`    ${c.summary}`);
        console.log(`    Notes: ${c.note_ids.join(", ")}`);
      }
      if (r.report.orphans.length > 0) {
        console.log(`\n## Orphans (no links): ${r.report.orphans.join(", ")}`);
      }
      if (r.report.suggested_links.length > 0) {
        console.log(`\n## Suggested links`);
        for (const l of r.report.suggested_links) {
          console.log(`  ${l.from} → ${l.to}`);
          console.log(`    ${l.reason}`);
        }
      }
      if (r.report.gaps.length > 0) {
        console.log(`\n## Suggested topics to add`);
        for (const g of r.report.gaps) console.log(`  + ${g}`);
      }
    }
  } else if (mode === "add") {
    if (!input) {
      console.error("add requires content");
      process.exit(1);
    }
    console.log(`📥 Adding: ${input.slice(0, 100)}…\n` + "─".repeat(60));
    const r = await addToKB(input);
    console.log("\n📋 TRACE\n");
    console.log(formatTrace(r.trace, { maxResultChars: 200 }));
    console.log("\n" + "─".repeat(60) + "\n📦 RESULT\n");
    if (r.summary) console.log(r.summary);
    if (r.notesCreated.length > 0) console.log(`\nNotes created: ${r.notesCreated.join(", ")}`);
    if (r.linksAdded.length > 0) {
      console.log(`Links added:`);
      for (const l of r.linksAdded) console.log(`  ${l.from} ↔ ${l.to}`);
    }
  } else {
    console.error(`Unknown mode: ${mode}\n`);
    console.log(HELP);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

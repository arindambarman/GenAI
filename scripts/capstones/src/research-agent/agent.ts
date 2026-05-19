import { runAgentLoop } from "../shared/agent-loop.js";
import type { Trace } from "../shared/trace.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { researchTools, listCorpus } from "./tools.js";
import {
  type Synthesis,
  SynthesisSchema,
  type FaithfulnessReport,
  type ResearchQuery,
} from "./schema.js";

export interface ResearchResult {
  query: ResearchQuery;
  synthesis: Synthesis | null;
  faithfulness: FaithfulnessReport | null;
  trace: Trace;
  stoppedBecause: string;
  error?: string;
}

/**
 * Run the research agent against a question.
 * Returns the synthesis, faithfulness audit, and full trace.
 */
export async function runResearchAgent(query: ResearchQuery): Promise<ResearchResult> {
  const corpus = await listCorpus();

  const userMessage = `# Research question

${query.question}

# Available corpus
${corpus.length} papers. Use search_corpus to find relevant ones.

# Constraints
- Use at least ${query.minSources} sources in your synthesis.
- Use at most ${query.maxSources} sources.
- Submit your final answer via submit_synthesis.`;

  const loopResult = await runAgentLoop({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: researchTools,
    maxSteps: 20,
    postProcessToolResult: (toolName, result) => {
      // Truncate large paper bodies to keep context manageable
      if (toolName === "read_paper") {
        const r = result as { body: string; title: string };
        const max = 3000;
        if (r.body.length > max) {
          return JSON.stringify(
            {
              ...r,
              body: r.body.slice(0, max) + `\n\n…[truncated ${r.body.length - max} chars]`,
            },
            null,
            2,
          );
        }
      }
      return typeof result === "string" ? result : JSON.stringify(result, null, 2);
    },
  });

  // Find the submit_synthesis tool result; that's our answer
  const submitStep = loopResult.trace.steps
    .filter((s) => s.kind === "tool_call" && s.tool === "submit_synthesis")
    .pop();

  let synthesis: Synthesis | null = null;
  let error: string | undefined;
  if (submitStep && submitStep.kind === "tool_call") {
    try {
      synthesis = SynthesisSchema.parse({ ...submitStep.args as object, question: query.question });
    } catch (err) {
      error = `Failed to parse submitted synthesis: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    error = "Agent did not call submit_synthesis. Final text: " + loopResult.finalText.slice(0, 200);
  }

  let faithfulness: FaithfulnessReport | null = null;
  if (synthesis) {
    faithfulness = await auditFaithfulness(synthesis);
  }

  return {
    query,
    synthesis,
    faithfulness,
    trace: loopResult.trace,
    stoppedBecause: loopResult.stoppedBecause,
    ...(error && { error }),
  };
}

/**
 * Independent audit: for each citation, re-check that the cited passage
 * appears in the corpus.
 */
export async function auditFaithfulness(synthesis: Synthesis): Promise<FaithfulnessReport> {
  const corpus = await listCorpus();
  const corpusById = new Map(corpus.map((p) => [p.id, p]));

  const unsupported: FaithfulnessReport["unsupported_claims"] = [];
  for (const citation of synthesis.citations) {
    const paper = corpusById.get(citation.source_id);
    if (!paper) {
      unsupported.push({
        claim: citation.supports,
        cited_source: citation.source_id,
        reason: `Source not in corpus`,
      });
      continue;
    }
    const passageStart = citation.passage.slice(0, 80).trim();
    if (!paper.body.includes(passageStart)) {
      unsupported.push({
        claim: citation.supports,
        cited_source: citation.source_id,
        reason: `Passage not found in source body`,
      });
    }
  }

  const total = synthesis.citations.length;
  const supportedCount = total - unsupported.length;
  return {
    total_claims: total,
    supported: supportedCount,
    unsupported: unsupported.length,
    faithfulness_score: total > 0 ? supportedCount / total : 1,
    unsupported_claims: unsupported,
  };
}

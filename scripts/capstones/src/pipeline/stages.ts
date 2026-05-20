import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { runLearnerAgent } from "../learner-agent/agent.js";
import { addToKB } from "../knowledge-agent/agent.js";
import { runBrainstormAgent } from "../brainstorm-agent/agent.js";
import { BrainstormQuerySchema } from "../brainstorm-agent/schema.js";
import { runResearchAgent } from "../research-agent/agent.js";
import { ResearchQuerySchema } from "../research-agent/schema.js";
import type {
  PipelineConfig,
  PipelineState,
  ProposedTopic,
  GroundedTopic,
  DraftProposal,
} from "./schema.js";
import type { PipelineStage } from "./orchestrator.js";

// ─── Stage 1: Learner — extract concepts from the course ────────────────

export function learnerStage(config: PipelineConfig): PipelineStage {
  return {
    name: "learn",
    description: "Extract concepts and optimisations from the course",
    skippable: (state) => state.learner_concepts.length > 0,
    run: async (state, hooks) => {
      // If caller provided cached learner output, load it instead of running.
      if (config.useCachedLearner && existsSync(config.useCachedLearner)) {
        hooks.onProgress(`Loading cached concepts from ${config.useCachedLearner}`);
        const raw = await readFile(config.useCachedLearner, "utf-8");
        const cachedConcepts = JSON.parse(raw) as Array<{
          id: string;
          name: string;
          definition: string;
          category: string;
          importance: number;
          source_lessons: string[];
        }>;
        state.learner_concepts = cachedConcepts.map((c) => ({
          ...c,
          source: "learner" as const,
        }));
        hooks.onProgress(`Loaded ${state.learner_concepts.length} concepts`);
        return state;
      }

      hooks.onProgress("Running Learner Agent on the course");
      const result = await runLearnerAgent({
        ...(config.modules && { modules: config.modules }),
        outputDir: resolve(config.outputDir, "learner-output"),
      }, (trace) => {
        // Lightweight per-step progress
        const last = trace.steps[trace.steps.length - 1];
        if (last?.kind === "tool_call") {
          hooks.onSubStep(`learner: ${last.tool}`);
        }
      });

      if (result.error) {
        throw new Error(`Learner stage failed: ${result.error}`);
      }
      state.learner_concepts = result.recordedState.concepts.map((c) => ({
        ...c,
        source: "learner" as const,
      }));
      state.learner_optimizations = result.recordedState.optimizations.map((o) => ({
        type: o.type,
        target_lessons: o.target_lessons,
        suggestion: o.suggestion,
        priority: o.priority,
      }));
      state.totalCost += result.trace.totalCost;
      state.totalLLMCalls += result.trace.totalLLMCalls;
      state.totalToolCalls += result.trace.totalToolCalls;
      hooks.onProgress(`Extracted ${state.learner_concepts.length} concepts, ${state.learner_optimizations.length} optimisations`);
      return state;
    },
  };
}

// ─── Stage 2: Populate KB — seed knowledge agent with concepts ──────────

export function populateKBStage(_config: PipelineConfig): PipelineStage {
  return {
    name: "populate-kb",
    description: "Populate Knowledge Agent's KB with extracted concepts",
    run: async (state, hooks) => {
      // For each top-N highest-importance concept, ask the Knowledge Agent
      // to incorporate it as a KB note. (Skip ones that look already present.)
      const top = state.learner_concepts
        .slice()
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5); // limit to avoid blowing up cost

      hooks.onProgress(`Adding ${top.length} top concepts to Knowledge Agent KB`);

      for (const c of top) {
        hooks.onSubStep(`add: ${c.name}`);
        const content = `${c.name}

Category: ${c.category}
Importance: ${c.importance}/10
Source lessons: ${c.source_lessons.join(", ")}

${c.definition}`;
        const result = await addToKB(content, (trace) => {
          const last = trace.steps[trace.steps.length - 1];
          if (last?.kind === "tool_call" && last.tool === "add_note") {
            hooks.onSubStep(`  added note`);
          }
        });
        if (result.notesCreated.length > 0) {
          state.kb_notes_created.push(...result.notesCreated);
        }
        state.totalCost += result.trace.totalCost;
        state.totalLLMCalls += result.trace.totalLLMCalls;
        state.totalToolCalls += result.trace.totalToolCalls;
      }

      hooks.onProgress(`Created ${state.kb_notes_created.length} new KB notes`);
      // Hint: rest of concepts already covered or duplicate; that's fine
      return state;
    },
  };
}

// ─── Stage 3: Brainstorm — propose missing topics ────────────────────────

export function brainstormGapsStage(config: PipelineConfig): PipelineStage {
  return {
    name: "brainstorm-gaps",
    description: "Propose topics missing from the course",
    run: async (state, hooks) => {
      const conceptList = state.learner_concepts
        .slice()
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 30)
        .map((c) => c.name)
        .join(", ");

      const topic = `Identify ${config.numProposedTopics} topics that are MISSING or UNDER-COVERED from an Agentic Systems course that already covers these concepts: ${conceptList}. For each missing topic, explain why a practitioner would benefit from it.`;

      hooks.onProgress(`Brainstorming ${config.numProposedTopics} missing topics`);
      const query = BrainstormQuerySchema.parse({
        topic,
        num_techniques: 4,
        ideas_per_technique: Math.max(3, config.numProposedTopics),
        constraints: [
          "Topics must be teachable in 1-2 hour lessons",
          "Topics must build on the existing course's discipline (eval/observability/safety)",
          "Avoid topics already covered (check the concept list)",
        ],
      });

      const result = await runBrainstormAgent(query, (trace) => {
        const last = trace.steps[trace.steps.length - 1];
        if (last?.kind === "tool_call") {
          hooks.onSubStep(`brainstorm: ${last.tool}`);
        }
      });

      if (result.error || !result.report) {
        throw new Error(`Brainstorm stage failed: ${result.error ?? "no report"}`);
      }

      // Take the top-N as proposed topics
      const topThreeIds = new Set(result.report.top_three.map((t) => t.id));
      const proposed: ProposedTopic[] = [];
      // First add the top 3 (with their reasoning)
      for (const t of result.report.top_three) {
        const idea = result.report.ideas.find((i) => i.id === t.id);
        if (!idea) continue;
        proposed.push({
          id: idea.id,
          title: idea.title,
          rationale: t.why_chosen,
          technique: idea.technique,
          scores: idea.scores,
        });
      }
      // Add additional ideas from the pool, sorted by composite score
      const remaining = result.report.ideas
        .filter((i) => !topThreeIds.has(i.id))
        .map((i) => ({
          idea: i,
          score: 0.35 * i.scores.impact + 0.30 * i.scores.feasibility + 0.20 * i.scores.novelty - 0.15 * i.scores.cost,
        }))
        .sort((a, b) => b.score - a.score);

      while (proposed.length < config.numProposedTopics && remaining.length > 0) {
        const next = remaining.shift();
        if (!next) break;
        proposed.push({
          id: next.idea.id,
          title: next.idea.title,
          rationale: next.idea.description,
          technique: next.idea.technique,
          scores: next.idea.scores,
        });
      }

      state.proposed_topics = proposed.slice(0, config.numProposedTopics);
      state.totalCost += result.trace.totalCost;
      state.totalLLMCalls += result.trace.totalLLMCalls;
      state.totalToolCalls += result.trace.totalToolCalls;

      hooks.onProgress(`Proposed ${state.proposed_topics.length} topics`);
      return state;
    },
  };
}

// ─── Stage 4: Research each topic — ground in literature ────────────────

export function researchTopicsStage(config: PipelineConfig): PipelineStage {
  return {
    name: "research-topics",
    description: "Research each proposed topic against the corpus",
    skippable: () => !config.researchPerTopic,
    run: async (state, hooks) => {
      hooks.onProgress(`Researching ${state.proposed_topics.length} topics`);
      const grounded: GroundedTopic[] = [];

      for (const topic of state.proposed_topics) {
        hooks.onSubStep(`research: ${topic.title}`);
        const question = `What does the research literature say about ${topic.title}, particularly in the context of LLM agents? Focus on practical patterns and known failure modes.`;

        try {
          const query = ResearchQuerySchema.parse({ question, minSources: 2, maxSources: 5 });
          const result = await runResearchAgent(query, (trace) => {
            const last = trace.steps[trace.steps.length - 1];
            if (last?.kind === "tool_call") {
              hooks.onSubStep(`  ${last.tool}`);
            }
          });

          if (result.synthesis && result.faithfulness) {
            grounded.push({
              topic,
              research_summary: result.synthesis.summary,
              citations: result.synthesis.citations,
              faithfulness_score: result.faithfulness.faithfulness_score,
              confidence: result.synthesis.confidence,
            });
          } else {
            // Couldn't ground — record placeholder
            grounded.push({
              topic,
              research_summary: `Research did not produce a synthesis: ${result.error ?? "unknown"}`,
              citations: [],
              faithfulness_score: 0,
              confidence: 0,
            });
          }
          state.totalCost += result.trace.totalCost;
          state.totalLLMCalls += result.trace.totalLLMCalls;
          state.totalToolCalls += result.trace.totalToolCalls;
        } catch (err) {
          hooks.onSubStep(`  failed: ${err instanceof Error ? err.message : String(err)}`);
          grounded.push({
            topic,
            research_summary: `Research failed: ${err instanceof Error ? err.message : String(err)}`,
            citations: [],
            faithfulness_score: 0,
            confidence: 0,
          });
        }
      }

      state.research_grounded = grounded;
      hooks.onProgress(`Grounded ${grounded.filter((g) => g.faithfulness_score > 0).length} / ${grounded.length} topics`);
      return state;
    },
  };
}

// ─── Stage 5: Synthesise — compose draft lesson proposals ────────────────

export function synthesiseStage(_config: PipelineConfig): PipelineStage {
  return {
    name: "synthesise",
    description: "Compose draft lesson proposals from research-grounded topics",
    run: async (state, hooks) => {
      hooks.onProgress("Composing draft lesson proposals");

      // If research stage ran, use grounded topics; otherwise fall back to proposed topics.
      const sourceTopics = state.research_grounded.length > 0
        ? state.research_grounded
        : state.proposed_topics.map((t) => ({
            topic: t,
            research_summary: "(research stage skipped — synthesising from brainstorm output alone)",
            citations: [] as { source_id: string; title: string; passage: string; supports: string }[],
            faithfulness_score: 0,
            confidence: 0,
          }));

      // Deterministic synthesis: combine topic + research + course context into a draft.
      const proposals: DraftProposal[] = sourceTopics.map((g, i) => {
        const lessonId = guessLessonId(g.topic, i);
        const insertion = guessInsertionPoint(g.topic, state.learner_concepts);

        return {
          topic_id: g.topic.id,
          proposed_lesson_id: lessonId,
          proposed_lesson_title: g.topic.title,
          insertion_point: insertion,
          rationale: g.topic.rationale,
          outline: {
            business_scenario: deriveBusinessScenario(g.topic),
            key_concepts: deriveKeyConcepts(g.topic, g.research_summary),
            math_required: deriveMath(g.topic),
            suggested_examples: deriveExamples(g.topic),
          },
          estimated_hours: estimateHours(g.topic),
          dependencies: deriveDependencies(g.topic, state.learner_concepts),
          citations: g.citations.map((c) => ({ source_id: c.source_id, title: c.title })),
        };
      });

      state.draft_proposals = proposals;
      hooks.onProgress(`Composed ${proposals.length} draft proposals`);

      // Write outputs to disk
      await writeProposalArtifacts(state);
      hooks.onProgress(`Output files written to ${state.outputDir}/`);

      return state;
    },
  };
}

// ─── Synthesis helpers ──────────────────────────────────────────────────

function guessLessonId(_topic: ProposedTopic, idx: number): string {
  // Naive: propose as new lesson in a new "extension" module
  return `14.${idx + 1}`;
}

function guessInsertionPoint(topic: ProposedTopic, _concepts: PipelineState["learner_concepts"]): string {
  const lower = topic.title.toLowerCase();
  if (lower.includes("memory") || lower.includes("rag") || lower.includes("retriev")) return "After Module 5 (Memory & RAG)";
  if (lower.includes("multi") || lower.includes("debate") || lower.includes("orchest")) return "After Module 6 (Multi-Agent)";
  if (lower.includes("tool") || lower.includes("mcp") || lower.includes("sandbox")) return "After Module 7 (Tools & MCP)";
  if (lower.includes("eval") || lower.includes("calibrat") || lower.includes("observ")) return "After Module 8 (Evaluation)";
  if (lower.includes("product") || lower.includes("cost") || lower.includes("durab")) return "After Module 9 (Production)";
  if (lower.includes("safety") || lower.includes("inject") || lower.includes("audit")) return "After Module 10 (Safety)";
  if (lower.includes("business") || lower.includes("roi")) return "After Module 11 (Business)";
  if (lower.includes("frontier") || lower.includes("future")) return "After Module 13 (Frontier)";
  return "New Module 14 (Extensions)";
}

function deriveBusinessScenario(topic: ProposedTopic): string {
  return `Apply ${topic.title.toLowerCase()} in one of the three case-study orgs (HSBC, Helix, Acme) — see the rationale for the specific framing: ${topic.rationale}`;
}

function deriveKeyConcepts(topic: ProposedTopic, researchSummary: string): string[] {
  // Extract candidate concepts from the research summary; very rough heuristic.
  const fromTitle = topic.title.split(/[\s:,]+/).filter((w) => w.length > 4).slice(0, 3);
  const fromSummary = (researchSummary.match(/\b[A-Z][a-zA-Z-]{4,}\b/g) ?? [])
    .slice(0, 5);
  return [...new Set([...fromTitle, ...fromSummary])].slice(0, 5);
}

function deriveMath(topic: ProposedTopic): string {
  const lower = topic.title.toLowerCase();
  if (lower.includes("retriev") || lower.includes("rag")) return "Information retrieval scoring (BM25, cosine similarity)";
  if (lower.includes("multi") || lower.includes("debate")) return "Bayesian aggregation of independent estimators";
  if (lower.includes("eval") || lower.includes("calibrat")) return "Statistical tests for accuracy differences; binomial confidence intervals";
  if (lower.includes("cost") || lower.includes("budget")) return "Expected-utility calculations with cost/quality trade-offs";
  return "Depends on the technique chosen; minimal math expected";
}

function deriveExamples(topic: ProposedTopic): string[] {
  return [
    `Worked example in the ${topic.technique} style: apply to a HSBC reconciliation scenario`,
    `Lab exercise: extend Sherpa v5 with the new pattern`,
    `Failure mode walkthrough: what goes wrong if you skip this`,
  ];
}

function estimateHours(_topic: ProposedTopic): number {
  return 1.5;
}

function deriveDependencies(_topic: ProposedTopic, _concepts: PipelineState["learner_concepts"]): string[] {
  return ["4.1 (Sherpa v1)", "8.1 (Eval discipline)"];
}

// ─── Output writer ──────────────────────────────────────────────────────

async function writeProposalArtifacts(state: PipelineState): Promise<void> {
  const dir = resolve(state.outputDir);
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, "proposals"), { recursive: true });

  // 1. summary.md
  const summary = [
    `# Pipeline Run Summary`,
    "",
    `**Goal:** ${state.goal}`,
    `**Generated:** ${new Date(state.startedAt).toISOString()}`,
    "",
    `## Stage results`,
    "",
    `| Stage | Status | Duration | Cost | LLM Calls |`,
    `|---|---|---|---|---|`,
    ...state.stageResults.map(
      (s) =>
        `| ${s.stage} | ${s.ok ? "✓" : "✗"} | ${(s.durationMs / 1000).toFixed(1)}s | $${s.cost.toFixed(4)} | ${s.llmCalls} |`,
    ),
    "",
    `**Total:** ${state.stageResults.reduce((a, s) => a + s.durationMs, 0) / 1000}s · $${state.totalCost.toFixed(4)} · ${state.totalLLMCalls} LLM calls`,
    "",
    `## Outputs`,
    "",
    `- Concepts extracted: ${state.learner_concepts.length}`,
    `- KB notes created: ${state.kb_notes_created.length}`,
    `- Topics proposed: ${state.proposed_topics.length}`,
    `- Topics grounded in research: ${state.research_grounded.filter((g) => g.faithfulness_score > 0).length}`,
    `- Draft proposals composed: ${state.draft_proposals.length}`,
  ].join("\n");
  await writeFile(join(dir, "summary.md"), summary, "utf-8");

  // 2. proposed-topics.md
  const topicsMd = [
    `# Proposed Topics`,
    "",
    ...state.proposed_topics.map(
      (t, i) =>
        [
          `## ${i + 1}. ${t.title}`,
          `**Technique:** ${t.technique}  ·  **Composite score:** ${(0.35 * t.scores.impact + 0.30 * t.scores.feasibility + 0.20 * t.scores.novelty - 0.15 * t.scores.cost).toFixed(2)}`,
          ``,
          `**Rationale:** ${t.rationale}`,
          ``,
          `**Scores:** novelty=${t.scores.novelty}, feasibility=${t.scores.feasibility}, impact=${t.scores.impact}, cost=${t.scores.cost}`,
          ``,
        ].join("\n"),
    ),
  ].join("\n");
  await writeFile(join(dir, "proposed-topics.md"), topicsMd, "utf-8");

  // 3. proposals/<id>.md — one per draft proposal
  for (const p of state.draft_proposals) {
    const md = [
      `# Draft Lesson ${p.proposed_lesson_id}: ${p.proposed_lesson_title}`,
      "",
      `**Insertion point:** ${p.insertion_point}`,
      `**Estimated time:** ${p.estimated_hours} hours`,
      `**Dependencies:** ${p.dependencies.join(", ")}`,
      "",
      `## Rationale`,
      p.rationale,
      "",
      `## Outline`,
      "",
      `### §1 Business scenario`,
      p.outline.business_scenario,
      "",
      `### §4 Key concepts`,
      ...p.outline.key_concepts.map((k) => `- ${k}`),
      "",
      `### §7 Math required`,
      p.outline.math_required,
      "",
      `### Suggested examples`,
      ...p.outline.suggested_examples.map((e) => `- ${e}`),
      "",
      `## Supporting citations`,
      ...(p.citations.length > 0
        ? p.citations.map((c) => `- [${c.source_id}] ${c.title}`)
        : ["(no citations grounded yet)"]),
    ].join("\n");
    await writeFile(join(dir, "proposals", `${p.topic_id}.md`), md, "utf-8");
  }
}

// ─── Helper to build the full pipeline ──────────────────────────────────

export function defaultStages(config: PipelineConfig): PipelineStage[] {
  return [
    learnerStage(config),
    populateKBStage(config),
    brainstormGapsStage(config),
    researchTopicsStage(config),
    synthesiseStage(config),
  ];
}

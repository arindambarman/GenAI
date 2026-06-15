/**
 * Eval & observability recipes: actionable patterns for measuring agent quality.
 * Each recipe cross-references concept_ids from concepts-seed.ts.
 */

export type SubArea =
  | "correctness" | "behavior" | "cost-latency" | "safety" | "ops";

export type Complexity = "starter" | "intermediate" | "advanced";

export interface Pitfall { trap: string; fix: string; }

export interface EvalRecipe {
  id: string;
  title: string;
  subArea: SubArea;
  complexity: Complexity;
  whenToUse: string;
  whatItMeasures: string;
  setup: string[];
  codeSnippet: { language: string; code: string };
  diagram: string;
  acceptanceThreshold: string;
  pitfalls: Pitfall[];
  conceptsApplied: string[];
  relatedRecipes: string[];
  readNext: string[];   // lesson ids
}

export const SUB_AREA_LABELS: Record<SubArea, string> = {
  correctness:    "Output correctness",
  behavior:       "Behavior & tool use",
  "cost-latency": "Cost & latency",
  safety:         "Safety & robustness",
  ops:            "Eval ops",
};

export const SUB_AREA_COLORS: Record<SubArea, { bg: string; border: string; text: string }> = {
  correctness:    { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a" },
  behavior:       { bg: "#dcfce7", border: "#16a34a", text: "#14532d" },
  "cost-latency": { bg: "#fef3c7", border: "#b45309", text: "#78350f" },
  safety:         { bg: "#fee2e2", border: "#b91c1c", text: "#7f1d1d" },
  ops:            { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
};

export const EVAL_RECIPES: EvalRecipe[] = [
  // ─── OUTPUT CORRECTNESS (8) ──────────────────────────────────────
  {
    id: "regression-eval-set",
    title: "Regression eval set",
    subArea: "correctness",
    complexity: "starter",
    whenToUse: "Before any agent ships to production, and as the foundation under every other eval.",
    whatItMeasures: "Whether code or prompt changes silently break previously-passing cases.",
    setup: [
      "Collect 50–200 representative inputs from real or synthetic traffic, stratified by intent.",
      "Annotate each input with a structured expected output (or a rubric the LLM-judge can apply).",
      "Freeze the set under version control; treat changes as schema migrations.",
      "Run on every PR via CI; fail the build if the pass rate drops below threshold.",
      "Add a new case every time a production bug is fixed.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runAgent } from "../src/agent.js";
import cases from "./regression-cases.json";

const CaseSchema = z.object({
  id: z.string(),
  input: z.string(),
  expected: z.object({ intent: z.string(), entities: z.array(z.string()) }),
});

describe("agent regression", () => {
  for (const c of CaseSchema.array().parse(cases)) {
    it(c.id, async () => {
      const got = await runAgent(c.input);
      expect(got.intent).toBe(c.expected.intent);
      expect(got.entities).toEqual(expect.arrayContaining(c.expected.entities));
    });
  }
});`,
    },
    diagram: `graph LR
  CASES[(regression-cases.json<br/>200 frozen cases)] --> RUN[Vitest run]
  PR[Pull Request] --> CI[CI gate]
  CI --> RUN
  RUN --> PASS{Pass rate<br/>>= threshold?}
  PASS -->|yes| MERGE[Allow merge]
  PASS -->|no| BLOCK[Block PR]`,
    acceptanceThreshold: "Pass rate ≥ 95% on every PR; investigate every regression before merging.",
    pitfalls: [
      { trap: "Eval set drifts from prod distribution", fix: "Refresh quarterly from a fresh sample of production traffic." },
      { trap: "Cases are too easy and never fail", fix: "Add hard cases from every prod incident; aim for a 5–10% baseline failure rate so the eval is informative." },
    ],
    conceptsApplied: ["regression-eval", "eval-gate"],
    relatedRecipes: ["ci-eval-gate", "llm-judge-rubric", "sample-size-power"],
    readNext: ["8.1", "4.5"],
  },
  {
    id: "llm-judge-rubric",
    title: "LLM-judge with structured rubric",
    subArea: "correctness",
    complexity: "intermediate",
    whenToUse: "When outputs are open-ended (summaries, answers, code) and exact-match scoring is too brittle.",
    whatItMeasures: "Subjective quality dimensions reduced to discrete scores via a judge model + rubric.",
    setup: [
      "Define 3–5 rubric dimensions (correctness, completeness, faithfulness, style, safety).",
      "For each dimension, write a 4-level scale (1: violates, 2: weak, 3: acceptable, 4: exemplary).",
      "Use a DIFFERENT model family than the agent under test (avoid self-judge bias).",
      "Calibrate the judge against human raters on a 50-pair subset; recompute kappa quarterly.",
      "Run with temperature 0 and structured output (tool use or JSON Schema).",
    ],
    codeSnippet: {
      language: "typescript",
      code: `import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const RubricSchema = z.object({
  correctness: z.number().int().min(1).max(4),
  completeness: z.number().int().min(1).max(4),
  faithfulness: z.number().int().min(1).max(4),
  rationale: z.string().max(280),
});

export async function judge(input: string, output: string) {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    temperature: 0,
    tools: [{
      name: "rate",
      description: "Score the answer against the rubric",
      input_schema: { type: "object", properties: { /* ... */ } },
    }],
    tool_choice: { type: "tool", name: "rate" },
    messages: [{ role: "user", content:
      \`Input: \${input}\\nAnswer: \${output}\\nApply the rubric.\` }],
  });
  return RubricSchema.parse((res.content[0] as any).input);
}`,
    },
    diagram: `graph LR
  AGENT[Agent output] --> JUDGE[Judge Model<br/>different family]
  RUBRIC[Rubric: 3-5 dims<br/>1-4 scale] --> JUDGE
  JUDGE --> SCORES[Structured scores]
  SCORES --> AGG[Weighted mean]
  HUMAN[(50-pair human<br/>calibration set)] -.kappa.- JUDGE`,
    acceptanceThreshold: "Cohen's kappa with human raters ≥ 0.7 on the calibration set; weighted score ≥ 3.2/4.",
    pitfalls: [
      { trap: "Judge prefers its own family's style", fix: "Always cross-family (e.g., judge Anthropic outputs with a non-Anthropic model when possible, or vice versa)." },
      { trap: "Rubric scores cluster at 3", fix: "Add concrete anchor examples for each level; force a relative judgment if possible." },
      { trap: "Faithfulness inflated when judge has internet access", fix: "Pass only the source material the agent had; never let the judge fetch fresh data." },
    ],
    conceptsApplied: ["llm-judge", "calibration-ece", "regression-eval"],
    relatedRecipes: ["citation-faithfulness", "pairwise-preference", "regression-eval-set"],
    readNext: ["8.3", "8.2"],
  },
  {
    id: "citation-faithfulness",
    title: "Citation faithfulness eval",
    subArea: "correctness",
    complexity: "intermediate",
    whenToUse: "Any RAG, document-grounded, or citation-emitting agent — before shipping and on every prompt change.",
    whatItMeasures: "The fraction of model claims that are verifiable against the cited source span.",
    setup: [
      "Sample 200 production queries stratified by topic and answer length.",
      "Parse each output into (claim, citation_span) pairs.",
      "Use LLM-judge to label each pair: verified | partially_verified | unsupported | contradicted.",
      "Compute weighted score: verified=1.0, partial=0.5, unsupported=0, contradicted=-1.",
      "Calibrate against human raters on 50 pairs; re-calibrate after every retrieval index change.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `const CitationVerdict = z.enum(["verified", "partial", "unsupported", "contradicted"]);
const ClaimResult = z.object({
  claim: z.string(),
  source_span: z.string(),
  verdict: CitationVerdict,
  note: z.string().optional(),
});

export async function evalCitations(answer: AgentAnswer): Promise<number> {
  const pairs = extractClaimCitationPairs(answer);
  const verdicts = await Promise.all(pairs.map((p) =>
    judgeClaim(p.claim, p.source_span)
  ));
  const score = verdicts.reduce((acc, v) => acc + {
    verified: 1, partial: 0.5, unsupported: 0, contradicted: -1,
  }[v.verdict], 0) / Math.max(verdicts.length, 1);
  return score;  // [-1, 1]
}`,
    },
    diagram: `graph LR
  ANS[Agent answer<br/>+ citations] --> EXT[Extract<br/>claim/source pairs]
  EXT --> JUDGE[LLM Judge<br/>per pair verdict]
  JUDGE --> SCORE[Weighted score]
  SCORE --> GATE{>= 0.95?}
  GATE -->|yes| SHIP[Ship]
  GATE -->|no| BLOCK[Block + alert]`,
    acceptanceThreshold: "Weighted score ≥ 0.95; zero contradicted claims; ≤ 1% unsupported.",
    pitfalls: [
      { trap: "Citations point to right doc, wrong page", fix: "Score at page+character granularity, not document-level." },
      { trap: "Drift after retrieval index rebuild", fix: "Make citation faithfulness eval a required gate on the indexing pipeline, not just the agent." },
      { trap: "Multi-sentence claims with partial support score as verified", fix: "Split into atomic claims before judging." },
    ],
    conceptsApplied: ["citation-faithfulness", "citations-api", "agentic-rag", "llm-judge"],
    relatedRecipes: ["llm-judge-rubric", "hallucination-rate"],
    readNext: ["5.5", "14.4", "8.3"],
  },
  {
    id: "exact-vs-semantic-match",
    title: "Exact-match vs semantic-match scoring",
    subArea: "correctness",
    complexity: "starter",
    whenToUse: "When choosing how to score a regression eval — exact for structured outputs, semantic for prose.",
    whatItMeasures: "Output equivalence, with different tolerances for surface variation.",
    setup: [
      "Classify each eval case by output type: structured (JSON, code, IDs) → exact; prose → semantic.",
      "For exact: compare normalized strings or parse + compare ASTs.",
      "For semantic: use embedding cosine similarity threshold (≥ 0.85) OR LLM-judge.",
      "For numeric: use tolerance windows (e.g., ±2% for dollar amounts).",
      "Log which scoring mode was used per case for auditability.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `import { cosine } from "./embedding.js";

export type Scorer = (expected: string, got: string) => Promise<number>;

export const exactScorer: Scorer = async (e, g) =>
  e.trim().toLowerCase() === g.trim().toLowerCase() ? 1 : 0;

export const semanticScorer = (threshold = 0.85): Scorer => async (e, g) => {
  const [ev, gv] = await Promise.all([embed(e), embed(g)]);
  const sim = cosine(ev, gv);
  return sim >= threshold ? sim : 0;
};

export const numericScorer = (tolPct: number): Scorer => async (e, g) => {
  const [a, b] = [parseFloat(e), parseFloat(g)];
  return Math.abs(a - b) / Math.abs(a) <= tolPct ? 1 : 0;
};`,
    },
    diagram: `graph TB
  CASE[Eval case] --> TYPE{Output type?}
  TYPE -->|JSON/code/ID| EXACT[Exact match]
  TYPE -->|prose| SEM[Semantic match<br/>cosine >= 0.85]
  TYPE -->|number| NUM[Tolerance window]
  EXACT --> SCORE[Score 0-1]
  SEM --> SCORE
  NUM --> SCORE`,
    acceptanceThreshold: "Per case-type aggregate ≥ 0.95; mixed sets weighted by case-type prevalence.",
    pitfalls: [
      { trap: "Exact-match on prose causes near-100% failures from punctuation drift", fix: "Always semantic for free-form text." },
      { trap: "Semantic threshold too low → false-positive 'matches'", fix: "Anchor the threshold on a labeled subset where you know matches from mismatches." },
    ],
    conceptsApplied: ["regression-eval", "calibration-ece"],
    relatedRecipes: ["regression-eval-set", "llm-judge-rubric"],
    readNext: ["8.1"],
  },
  {
    id: "schema-conformance",
    title: "Schema conformance eval",
    subArea: "correctness",
    complexity: "starter",
    whenToUse: "Any agent that produces structured output (tool calls, JSON responses, code).",
    whatItMeasures: "The rate at which raw model output validates against the declared schema before any retry/repair.",
    setup: [
      "Wrap your output schema in Zod (or JSON Schema with ajv).",
      "Parse the raw first-attempt output; log success/failure per case.",
      "Distinguish 'invalid' (parse fail) from 'wrong content' (parsed but semantically off).",
      "Track per-field failure rates — they reveal which schema parts the model struggles with.",
      "Gate releases on first-try conformance ≥ 99% with strict tool use enabled.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `import { z } from "zod";

const OrderSchema = z.object({
  order_id: z.string().regex(/^ord_[a-z0-9]{12}$/),
  amount_cents: z.number().int().positive(),
  items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })).min(1),
});

export function evalConformance(rawOutputs: unknown[]) {
  const results = rawOutputs.map((r) => OrderSchema.safeParse(r));
  const failures = results.filter((r) => !r.success);
  const byField: Record<string, number> = {};
  for (const f of failures) {
    for (const issue of f.error.issues) {
      const path = issue.path.join(".") || "<root>";
      byField[path] = (byField[path] ?? 0) + 1;
    }
  }
  return { passRate: 1 - failures.length / rawOutputs.length, byField };
}`,
    },
    diagram: `graph LR
  OUT[Raw model output] --> ZOD[Zod parse]
  ZOD -->|ok| PASS[Pass]
  ZOD -->|fail| ISSUE[Per-field issues]
  ISSUE --> AGG[Failure heatmap<br/>by field path]
  PASS --> METRIC[Pass rate >= 99%?]
  AGG --> METRIC`,
    acceptanceThreshold: "First-try conformance ≥ 99% with strict tool use; ≥ 95% without.",
    pitfalls: [
      { trap: "Counting retried outputs as passes", fix: "Always score the FIRST raw response; track retry rate separately." },
      { trap: "Schema is too loose, masks real errors", fix: "Add field-level constraints (regex, ranges, enum)." },
    ],
    conceptsApplied: ["strict-tool-use", "constrained-decoding", "tool-use-claude"],
    relatedRecipes: ["regression-eval-set", "tool-argument-validity"],
    readNext: ["3.3", "3.4", "14.1"],
  },
  {
    id: "calibration-ece",
    title: "Calibration / ECE",
    subArea: "correctness",
    complexity: "intermediate",
    whenToUse: "When the agent emits confidence scores that downstream code or humans rely on.",
    whatItMeasures: "Expected Calibration Error — gap between stated confidence and actual accuracy.",
    setup: [
      "Bucket predictions into 10 confidence bins (0.0–0.1, 0.1–0.2, ..., 0.9–1.0).",
      "For each bin, compute actual accuracy (fraction correct) and mean stated confidence.",
      "ECE = Σ (bin_weight × |accuracy_bin − confidence_bin|).",
      "Plot a reliability diagram; deviations from y=x reveal over-/under-confidence.",
      "Recalibrate via temperature scaling or Platt scaling if ECE > 0.05.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `type Pred = { confidence: number; correct: boolean };

export function ece(preds: Pred[], bins = 10): number {
  const buckets: Pred[][] = Array.from({ length: bins }, () => []);
  for (const p of preds) {
    const idx = Math.min(bins - 1, Math.floor(p.confidence * bins));
    buckets[idx].push(p);
  }
  let err = 0;
  for (const b of buckets) {
    if (b.length === 0) continue;
    const acc = b.filter((p) => p.correct).length / b.length;
    const conf = b.reduce((s, p) => s + p.confidence, 0) / b.length;
    err += (b.length / preds.length) * Math.abs(acc - conf);
  }
  return err;
}`,
    },
    diagram: `graph LR
  PREDS[(predictions<br/>confidence + correct)] --> BIN[10 confidence bins]
  BIN --> RD[Reliability diagram]
  BIN --> ECE[ECE = sum weight * |acc - conf|]
  ECE -->|> 0.05| FIX[Temperature / Platt scaling]
  ECE -->|<= 0.05| OK[Well-calibrated]`,
    acceptanceThreshold: "ECE ≤ 0.05 across the eval set; reliability diagram visually tracks y=x line.",
    pitfalls: [
      { trap: "Too few samples per bin → noisy ECE", fix: "Need ≥ 30 samples per bin; collapse sparse bins or sample more." },
      { trap: "Model confidence is binary-like (all 0.9+)", fix: "Use raw token logprobs as the confidence signal, or ask for a 1-5 score with anchor examples." },
    ],
    conceptsApplied: ["calibration-ece", "regression-eval"],
    relatedRecipes: ["llm-judge-rubric", "regression-eval-set"],
    readNext: ["8.2"],
  },
  {
    id: "multi-turn-coherence",
    title: "Multi-turn coherence eval",
    subArea: "correctness",
    complexity: "advanced",
    whenToUse: "Any conversational agent where context needs to persist across 3+ turns (support bots, tutors, planners).",
    whatItMeasures: "Whether the agent maintains state, doesn't contradict itself, and tracks references across turns.",
    setup: [
      "Author multi-turn scripts (5–10 turns each) with planted state, references, and consistency checks.",
      "Replay each script against the agent, comparing later-turn outputs against expectations.",
      "Use an LLM judge to spot self-contradictions across the full conversation.",
      "Score: state retention (named entities preserved), reference resolution ('it' resolved correctly), consistency (no contradictions).",
      "Add adversarial turns that try to confuse the agent (ambiguous pronouns, context switches).",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface Script {
  id: string;
  turns: Array<{ user: string; expect?: Partial<{ contains: string[]; entity: string }> }>;
}

export async function evalScript(script: Script, agent: Agent) {
  const history: Message[] = [];
  let passes = 0, total = 0;
  for (const turn of script.turns) {
    history.push({ role: "user", content: turn.user });
    const reply = await agent.respond(history);
    history.push({ role: "assistant", content: reply });
    if (turn.expect) {
      total++;
      const ok = (turn.expect.contains ?? []).every((s) => reply.includes(s));
      if (ok) passes++;
    }
  }
  const contradictions = await detectContradictions(history);
  return { passes, total, contradictions };
}`,
    },
    diagram: `graph TB
  SCRIPT[Multi-turn script<br/>5-10 turns] --> REPLAY[Replay vs agent]
  REPLAY --> STATE[State retention check]
  REPLAY --> REF[Reference resolution]
  REPLAY --> JUDGE[Contradiction judge<br/>full transcript]
  STATE --> SCORE[Per-script score]
  REF --> SCORE
  JUDGE --> SCORE`,
    acceptanceThreshold: "Turn-level pass ≥ 90%; zero contradictions per 5-turn script; entity recall ≥ 95%.",
    pitfalls: [
      { trap: "Scripts test happy path only", fix: "Add adversarial turns: ambiguity, context switch, planted misinformation." },
      { trap: "Cost spikes from long-context replay", fix: "Cache the system prompt + early turns; only the final turn pays full cost." },
    ],
    conceptsApplied: ["regression-eval", "memory-compaction", "sherpa-v2"],
    relatedRecipes: ["llm-judge-rubric", "context-bloat-detect"],
    readNext: ["4.2", "5.3", "8.1"],
  },
  {
    id: "pairwise-preference",
    title: "Pairwise preference eval",
    subArea: "correctness",
    complexity: "intermediate",
    whenToUse: "When comparing two prompt/model versions head-to-head and absolute scoring is fuzzy.",
    whatItMeasures: "Which of two candidate outputs a (human or LLM) judge prefers, per query.",
    setup: [
      "Pick 100 representative queries (avoid easy/trivial ones — they tie too often).",
      "Generate output from candidate A and candidate B; randomize presentation order to mitigate position bias.",
      "Show pairs to judge; record A | B | tie verdict.",
      "Compute win rate of A vs B with confidence interval (binomial proportion).",
      "Statistical significance: need ~100 non-tie verdicts for a 10pt difference at p<0.05.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `type Verdict = "A" | "B" | "tie";

export async function pairwise(queries: string[], agentA: Agent, agentB: Agent) {
  const verdicts: Verdict[] = [];
  for (const q of queries) {
    const [a, b] = await Promise.all([agentA.respond(q), agentB.respond(q)]);
    const order = Math.random() < 0.5 ? [a, b] : [b, a];
    const pickedIdx = await judgeBetterIdx(q, order); // 0 or 1 or null
    if (pickedIdx === null) verdicts.push("tie");
    else verdicts.push(order[pickedIdx] === a ? "A" : "B");
  }
  const wins = verdicts.filter((v) => v === "A").length;
  const losses = verdicts.filter((v) => v === "B").length;
  return { wins, losses, ties: verdicts.length - wins - losses };
}`,
    },
    diagram: `graph LR
  Q[100 queries] --> GEN[Generate A and B]
  GEN --> SHUFFLE[Randomize order]
  SHUFFLE --> JUDGE[Judge picks better]
  JUDGE --> AGG[Win rate + 95% CI]
  AGG --> DECIDE{Significant?}
  DECIDE -->|yes| PROMOTE[Promote winner]
  DECIDE -->|no| MORE[Collect more samples]`,
    acceptanceThreshold: "Win rate ≥ 55% with 95% CI lower bound > 50% on at least 100 non-tie verdicts.",
    pitfalls: [
      { trap: "Position bias (judges prefer first option)", fix: "Always randomize order; verify by swapping after the fact." },
      { trap: "Tie rate > 50% → eval set too easy", fix: "Pick harder queries; consider forcing a pick (no tie option)." },
    ],
    conceptsApplied: ["llm-judge", "regression-eval"],
    relatedRecipes: ["llm-judge-rubric", "prompt-ab-eval"],
    readNext: ["8.3"],
  },

  // ─── BEHAVIOR & TOOL USE (5) ─────────────────────────────────────
  {
    id: "tool-trajectory",
    title: "Tool trajectory eval",
    subArea: "behavior",
    complexity: "intermediate",
    whenToUse: "Any tool-using agent — check it picks the right tools in roughly the right order.",
    whatItMeasures: "Whether the sequence of tool calls matches expectations (loose match — order may vary, but key tools must be invoked).",
    setup: [
      "For each eval case, annotate the expected tool-call set + minimal ordering constraints.",
      "Run the agent and capture the actual tool-call trace.",
      "Score: precision (tools called that should have been) + recall + Kendall's tau on ordering.",
      "Bonus: flag 'phantom' tool calls (called but unnecessary) and 'missed' calls (should have been but weren't).",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface ToolTrajectory {
  expected: Array<{ tool: string; mustBeBefore?: string[] }>;
  actual: Array<{ tool: string; args: Record<string, unknown> }>;
}

export function scoreTrajectory(t: ToolTrajectory) {
  const actualNames = t.actual.map((c) => c.tool);
  const expectedNames = t.expected.map((e) => e.tool);
  const recall = expectedNames.filter((n) => actualNames.includes(n)).length / expectedNames.length;
  const precision = actualNames.filter((n) => expectedNames.includes(n)).length / actualNames.length;
  // ordering: for each "mustBeBefore" constraint, verify it holds
  const orderingOk = t.expected.every((e) =>
    (e.mustBeBefore ?? []).every((after) =>
      actualNames.indexOf(e.tool) < actualNames.indexOf(after)));
  return { precision, recall, orderingOk, f1: 2 * precision * recall / (precision + recall) };
}`,
    },
    diagram: `graph LR
  CASE[Eval case<br/>+ expected trajectory] --> AGENT[Run agent]
  AGENT --> TRACE[Actual trace]
  TRACE --> SCORE[Precision / recall / ordering]
  SCORE --> REPORT[F1 + phantom + missed tools]`,
    acceptanceThreshold: "F1 ≥ 0.85; ordering constraints satisfied on 100% of cases; phantom-call rate ≤ 10%.",
    pitfalls: [
      { trap: "Over-specifying order kills valid alternative paths", fix: "Only constrain order where it's truly required (causal dependencies)." },
      { trap: "Phantom calls inflate cost without affecting answer quality eval", fix: "Track phantom rate independently as a cost signal." },
    ],
    conceptsApplied: ["strict-tool-use", "tool-registry", "observability-spans"],
    relatedRecipes: ["tool-argument-validity", "tool-failure-recovery"],
    readNext: ["7.1", "7.3", "8.4"],
  },
  {
    id: "tool-argument-validity",
    title: "Tool argument validity eval",
    subArea: "behavior",
    complexity: "starter",
    whenToUse: "Any tool-using agent; cheapest check that catches a huge class of bugs.",
    whatItMeasures: "Whether tool calls have valid arguments against the declared input_schema.",
    setup: [
      "Define each tool's input_schema as a Zod object (or JSON Schema).",
      "On every tool call (eval or production), validate arguments before execution.",
      "Track per-tool validity rate and per-field failure breakdown.",
      "First-attempt validity (no retry) is the headline metric — retries hide the real failure rate.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `import { z } from "zod";

const ToolSchemas = {
  search: z.object({ query: z.string().min(1).max(200), top_k: z.number().int().min(1).max(50) }),
  fetch_url: z.object({ url: z.string().url() }),
  send_email: z.object({ to: z.string().email(), subject: z.string(), body: z.string() }),
};

export function validateToolCall(name: keyof typeof ToolSchemas, args: unknown) {
  const result = ToolSchemas[name].safeParse(args);
  return result.success
    ? { valid: true as const, args: result.data }
    : { valid: false as const, issues: result.error.issues };
}`,
    },
    diagram: `graph LR
  CALL[Tool call from model] --> SCHEMA[Zod input_schema]
  SCHEMA -->|valid| EXEC[Execute tool]
  SCHEMA -->|invalid| LOG[Log + reject<br/>before exec]
  LOG --> METRIC[Per-tool validity rate]`,
    acceptanceThreshold: "First-attempt validity ≥ 98% per tool; outlier tools investigated for schema/prompt issues.",
    pitfalls: [
      { trap: "Schema too permissive (any-string fields)", fix: "Tighten with regex/enum/length constraints; most validity wins come from these." },
      { trap: "Counting after retry/repair", fix: "Always log the FIRST attempt; retry should be a separate metric." },
    ],
    conceptsApplied: ["strict-tool-use", "constrained-decoding", "tool-use-claude"],
    relatedRecipes: ["schema-conformance", "tool-trajectory"],
    readNext: ["3.3", "14.1"],
  },
  {
    id: "refusal-rate",
    title: "Refusal / over-refusal eval",
    subArea: "behavior",
    complexity: "intermediate",
    whenToUse: "Whenever safety prompting or guardrails change — they're notorious for over-refusing legitimate queries.",
    whatItMeasures: "Two rates: (a) over-refusals on benign queries, (b) under-refusals on truly unsafe queries.",
    setup: [
      "Build two sets: 100 benign-but-sensitive queries (medical info, legal advice, etc.) + 100 truly unsafe queries.",
      "Classify each response as 'answered', 'refused', or 'hedged with answer'.",
      "Over-refusal rate = refusals on benign / benign queries.",
      "Under-refusal rate = answered on unsafe / unsafe queries.",
      "Track both rates per release; flag if either crosses threshold.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `const ResponseType = z.enum(["answered", "refused", "hedged"]);

export async function classifyRefusal(response: string): Promise<z.infer<typeof ResponseType>> {
  // simple heuristic plus optional LLM-judge fallback
  const refusalPhrases = ["I can't", "I cannot", "I'm not able to", "I won't"];
  const hasRefusal = refusalPhrases.some((p) => response.toLowerCase().includes(p.toLowerCase()));
  const hasAnswer = response.length > 200 && !hasRefusal;
  if (hasRefusal && !hasAnswer) return "refused";
  if (hasRefusal && hasAnswer) return "hedged";
  return "answered";
}`,
    },
    diagram: `graph TB
  BENIGN[100 benign-sensitive] --> AGENT[Agent]
  UNSAFE[100 unsafe] --> AGENT
  AGENT --> CLS[Classify response<br/>answered/refused/hedged]
  CLS --> OVER[Over-refusal rate<br/>refused on benign]
  CLS --> UNDER[Under-refusal rate<br/>answered on unsafe]`,
    acceptanceThreshold: "Over-refusal ≤ 5% on benign-sensitive set; under-refusal ≤ 1% on unsafe set.",
    pitfalls: [
      { trap: "Hedged responses miscounted as refusals", fix: "Three-way classification (answered/refused/hedged) — never collapse." },
      { trap: "Safety prompt changes silently increase over-refusal", fix: "Make this eval a required gate on safety-prompt PRs." },
    ],
    conceptsApplied: ["prompt-injection", "red-team", "regression-eval"],
    relatedRecipes: ["red-team-injection", "jailbreak-resistance"],
    readNext: ["10.1", "10.3"],
  },
  {
    id: "safety-guardrail-adherence",
    title: "Safety guardrail adherence",
    subArea: "behavior",
    complexity: "advanced",
    whenToUse: "Any agent with hard rules ('never recommend a specific stock', 'always include disclaimer X').",
    whatItMeasures: "Whether the agent follows declared hard rules in every response.",
    setup: [
      "Codify rules as a checklist (each rule is a boolean check on the output).",
      "Build an eval set of 200 queries — some that try to bait the agent into breaking each rule.",
      "Implement each check as a separate function (regex, pattern, LLM-judge).",
      "Run on every release; any rule-break is a P0 fix, never a 'we'll improve next sprint'.",
      "Add to red-team set after every observed prod violation.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface Guardrail {
  id: string;
  description: string;
  check: (response: string, context?: unknown) => boolean | Promise<boolean>;
}

const GUARDRAILS: Guardrail[] = [
  { id: "no-stock-pick", description: "Never recommend a specific ticker",
    check: (r) => !/\\b[A-Z]{2,5}\\s*(stock|shares|buy|sell)\\b/.test(r) },
  { id: "disclaimer-present", description: "Financial answers must include disclaimer",
    check: (r) => r.includes("not financial advice") },
];

export async function evalGuardrails(query: string, response: string) {
  const violations: string[] = [];
  for (const g of GUARDRAILS) {
    if (!(await g.check(response))) violations.push(g.id);
  }
  return { passed: violations.length === 0, violations };
}`,
    },
    diagram: `graph LR
  CASE[Eval case<br/>+ bait queries] --> AGENT[Agent]
  AGENT --> CHECKS[Per-rule checks]
  CHECKS --> VIO[Violations list]
  VIO -->|any| BLOCK[Block release · P0]
  VIO -->|none| PASS[Pass]`,
    acceptanceThreshold: "100% adherence on all guardrails — every violation is a release blocker.",
    pitfalls: [
      { trap: "Rule checks too narrow (regex misses paraphrases)", fix: "Combine regex with LLM-judge for the 'spirit' of the rule." },
      { trap: "Bait queries don't represent real attacks", fix: "Use real prod-observed bait when available; refresh quarterly." },
    ],
    conceptsApplied: ["red-team", "prompt-injection", "audit-trail"],
    relatedRecipes: ["red-team-injection", "refusal-rate"],
    readNext: ["10.2", "10.3", "10.4"],
  },
  {
    id: "tool-failure-recovery",
    title: "Tool failure recovery eval",
    subArea: "behavior",
    complexity: "intermediate",
    whenToUse: "Any agent that depends on flaky external tools (APIs, databases, web fetches).",
    whatItMeasures: "Whether the agent gracefully handles tool failures (retries, alternative tools, user-visible degradation) instead of crashing or hallucinating.",
    setup: [
      "Build a fault-injection harness that returns errors on a controlled subset of tool calls (timeouts, 500s, malformed responses).",
      "For each fault type, score the agent's recovery: (a) detected, (b) appropriate action (retry/fallback/give up gracefully), (c) user-visible explanation.",
      "Cover at least: transient error, hard error, malformed JSON, timeout, rate-limit.",
      "Track recovery rate per fault type.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `type Fault = "timeout" | "500" | "malformed" | "ratelimit";

export function withFault(realTool: Tool, fault: Fault): Tool {
  return async (args) => {
    if (fault === "timeout") return new Promise((_, rej) =>
      setTimeout(() => rej(new Error("ETIMEDOUT")), 10000));
    if (fault === "500") throw Object.assign(new Error("Internal Error"), { status: 500 });
    if (fault === "malformed") return { __raw: "<<not-json>>" };
    if (fault === "ratelimit") throw Object.assign(new Error("Rate limited"), { status: 429 });
    return realTool(args);
  };
}`,
    },
    diagram: `graph LR
  CASE[Eval case] --> FAULT[Fault injector<br/>timeout/500/malformed/429]
  FAULT --> AGENT[Agent under test]
  AGENT --> CLASSIFY[Recovery class:<br/>retried · fell back · gave up · crashed]
  CLASSIFY --> SCORE[Per-fault recovery rate]`,
    acceptanceThreshold: "Graceful-recovery rate ≥ 95% per fault type; zero hallucinated answers when tools fail.",
    pitfalls: [
      { trap: "Agent hallucinates an answer when retrieval fails", fix: "Detect by checking that responses include no fact-claims when tools all failed." },
      { trap: "Retry storms exceed rate-limit budget", fix: "Test retry policy under rate-limit faults too." },
    ],
    conceptsApplied: ["durable-execution", "retry-idempotency", "runbooks"],
    relatedRecipes: ["tool-trajectory", "tail-latency-analysis"],
    readNext: ["9.1", "9.2", "9.4"],
  },

  // ─── COST & LATENCY (4) ──────────────────────────────────────────
  {
    id: "cost-per-task",
    title: "Cost per task tracking",
    subArea: "cost-latency",
    complexity: "starter",
    whenToUse: "From day one — every production agent. Cost surprises are the #1 reason agents get killed.",
    whatItMeasures: "Total API cost per logical task (input + output tokens, by model, with cache savings).",
    setup: [
      "Capture usage from every Anthropic response: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens.",
      "Apply your tier's pricing per model; account for cached input at 10% rate.",
      "Aggregate per task_id (you assign one per logical user request, spanning all tool calls + retries).",
      "Track distribution (p50, p95, p99) — averages hide the long tail that bankrupts you.",
      "Alert on p99 > 5× p50 — usually means infinite loops or context bloat.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface Usage {
  input_tokens: number; output_tokens: number;
  cache_creation_input_tokens?: number; cache_read_input_tokens?: number;
}
const PRICE = { // per million tokens, claude-sonnet-4-6 example
  input: 3.00, output: 15.00, cache_write: 3.75, cache_read: 0.30,
};
export function costUSD(u: Usage): number {
  const M = 1_000_000;
  return (
    (u.input_tokens / M) * PRICE.input +
    (u.output_tokens / M) * PRICE.output +
    ((u.cache_creation_input_tokens ?? 0) / M) * PRICE.cache_write +
    ((u.cache_read_input_tokens ?? 0) / M) * PRICE.cache_read
  );
}`,
    },
    diagram: `graph LR
  CALL[LLM call] --> USAGE[Usage block]
  USAGE --> CALC[cost = tokens * price/M]
  CALC --> AGG[Sum per task_id]
  AGG --> DIST[p50 / p95 / p99]
  DIST --> ALERT{p99 > 5x p50?}
  ALERT -->|yes| INVESTIGATE[Investigate loops/bloat]`,
    acceptanceThreshold: "Cost per task within 20% of budget at p95; p99 within 5× p50 (long-tail health).",
    pitfalls: [
      { trap: "Forgetting to sum across retries/tool calls", fix: "Stamp every LLM call with a task_id propagated through your trace context." },
      { trap: "Average masks tail", fix: "Track p99 as the headline; means are misleading on heavy-tailed distributions." },
    ],
    conceptsApplied: ["cache-control", "prompt-cache-prod", "model-tier-routing"],
    relatedRecipes: ["token-usage-attribution", "tail-latency-analysis"],
    readNext: ["9.3", "14.2", "14.5"],
  },
  {
    id: "latency-percentiles",
    title: "Latency p50/p95/p99",
    subArea: "cost-latency",
    complexity: "starter",
    whenToUse: "Every interactive agent. Means lie; only percentiles tell the user-perceived story.",
    whatItMeasures: "End-to-end response time distribution from user input to final response.",
    setup: [
      "Stamp every request with start/end timestamps including all tool calls and LLM hops.",
      "Aggregate per route/intent — global percentiles hide critical-path issues.",
      "Compute p50, p95, p99 over rolling 5-minute windows.",
      "Separately track time-to-first-token (TTFT) for streaming UX — it's what users feel.",
      "Compare against budget; alert when p95 exceeds it for 3 consecutive windows.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `export function percentiles(latencies: number[], ps = [50, 95, 99]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  return Object.fromEntries(ps.map((p) => {
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return [\`p\${p}\`, sorted[idx]];
  }));
}
// Usage:
const stats = percentiles(window.map((r) => r.endMs - r.startMs));
// { p50: 1200, p95: 4500, p99: 12000 }`,
    },
    diagram: `graph LR
  REQ[Request] --> SPAN[Start span]
  SPAN --> EXEC[Agent loop]
  EXEC --> END[End span]
  END --> METRIC[(latency_ms)]
  METRIC --> PCT[p50 / p95 / p99<br/>rolling 5-min]
  PCT --> ALERT{p95 > budget?}`,
    acceptanceThreshold: "p95 ≤ target SLA; p99 ≤ 3× p95; TTFT ≤ 1s for streaming UX.",
    pitfalls: [
      { trap: "Tracking averages instead of percentiles", fix: "Averages are useless for latency; only percentiles match user experience." },
      { trap: "Combining routes inflates p99", fix: "Per-route percentiles; one slow tool drags the global." },
    ],
    conceptsApplied: ["observability-spans", "runbooks"],
    relatedRecipes: ["tail-latency-analysis", "cost-per-task"],
    readNext: ["8.4", "9.4"],
  },
  {
    id: "token-usage-attribution",
    title: "Token usage attribution",
    subArea: "cost-latency",
    complexity: "intermediate",
    whenToUse: "When cost-per-task is too high and you need to know which prompt component is the offender.",
    whatItMeasures: "Token breakdown by phase (system prompt, history, tool results, retrieval context, output).",
    setup: [
      "Tag each prompt component with a label before sending (system | retrieval | history | tool_result).",
      "After response, attribute input_tokens to labels proportionally to their character length.",
      "Aggregate per label across the eval set.",
      "Find the top offenders; usually retrieval context or unbounded history.",
      "Action items: cache the static parts, compact the growing parts.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface PromptPart { label: string; content: string; }

export function attributeTokens(parts: PromptPart[], totalInputTokens: number) {
  const totalChars = parts.reduce((s, p) => s + p.content.length, 0);
  return parts.map((p) => ({
    label: p.label,
    chars: p.content.length,
    estimatedTokens: Math.round((p.content.length / totalChars) * totalInputTokens),
    pctOfInput: (p.content.length / totalChars) * 100,
  }));
}`,
    },
    diagram: `graph TB
  PARTS[Tagged prompt parts<br/>system/retrieval/history/tool] --> SEND[Send to API]
  SEND --> USAGE[input_tokens response]
  USAGE --> ATTR[Attribute by char ratio]
  ATTR --> RANK[Top-N offenders]
  RANK --> ACTION[Cache static / compact growing]`,
    acceptanceThreshold: "No single label > 60% of input tokens unless it's the cached system prompt.",
    pitfalls: [
      { trap: "Character-ratio approximates tokens but isn't exact", fix: "Good enough for triage; for precision, use the tokenizer offline." },
      { trap: "Forgot to label cached vs uncached", fix: "Cache-hit ratio per label is the bigger lever than absolute token count." },
    ],
    conceptsApplied: ["cache-control", "prompt-cache-prod", "memory-compaction"],
    relatedRecipes: ["cost-per-task"],
    readNext: ["14.2", "9.3", "5.3"],
  },
  {
    id: "tail-latency-analysis",
    title: "Tail latency analysis",
    subArea: "cost-latency",
    complexity: "advanced",
    whenToUse: "When p99 latency is the bottleneck and you need to find the root cause.",
    whatItMeasures: "What's happening in the slow 1% — long agent loops, retries, slow tools, cold caches.",
    setup: [
      "Filter traces to the top 1% by total duration.",
      "Bucket by root cause: tool latency, LLM latency, loop iterations, retries.",
      "Compare loop-iteration count distribution for tail vs median requests.",
      "Identify the single biggest contributor; fix it; re-measure.",
      "Set a tail-latency SLO (p99) separately from median.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface Trace {
  totalMs: number;
  llmMs: number; toolMs: number;
  loopIterations: number; retries: number;
}
export function tailBreakdown(traces: Trace[], pct = 99) {
  const sorted = [...traces].sort((a, b) => a.totalMs - b.totalMs);
  const cutoff = sorted[Math.floor(sorted.length * pct / 100)];
  const tail = traces.filter((t) => t.totalMs >= cutoff.totalMs);
  const median = traces.filter((t) => t.totalMs < cutoff.totalMs);
  const avg = (arr: Trace[], f: (t: Trace) => number) => arr.reduce((s, t) => s + f(t), 0) / arr.length;
  return {
    tailVsMedian: {
      llmMs: avg(tail, t => t.llmMs) / avg(median, t => t.llmMs),
      toolMs: avg(tail, t => t.toolMs) / avg(median, t => t.toolMs),
      loops: avg(tail, t => t.loopIterations) / avg(median, t => t.loopIterations),
      retries: avg(tail, t => t.retries) / avg(median, t => t.retries),
    },
  };
}`,
    },
    diagram: `graph LR
  TRACES[(All traces)] --> FILTER[Top 1%]
  FILTER --> BUCKET[Bucket by:<br/>LLM · tool · loops · retries]
  BUCKET --> COMPARE[Tail vs median ratio]
  COMPARE --> ROOT[Top contributor]
  ROOT --> FIX[Targeted fix]`,
    acceptanceThreshold: "p99 ≤ 3× p95 after tuning; no single root cause > 50% of tail traces.",
    pitfalls: [
      { trap: "Tail dominated by infinite loops", fix: "Hard loop-iteration limit + emergency abort; don't try to fix the agent reasoning first." },
      { trap: "Tool retries account for half the tail", fix: "Tighten retry budget; failing fast can beat retrying slowly." },
    ],
    conceptsApplied: ["observability-spans", "durable-execution", "retry-idempotency"],
    relatedRecipes: ["latency-percentiles", "tool-failure-recovery"],
    readNext: ["9.2", "8.4"],
  },

  // ─── SAFETY & ROBUSTNESS (4) ─────────────────────────────────────
  {
    id: "red-team-injection",
    title: "Red-team prompt-injection eval",
    subArea: "safety",
    complexity: "advanced",
    whenToUse: "Any agent that ingests external content (web pages, emails, user-uploaded docs, tool outputs).",
    whatItMeasures: "Whether the agent follows attacker-injected instructions hidden in retrieved content.",
    setup: [
      "Build an injection corpus: 50–100 attacks across 5 channels (HTML hidden text, comments, base64, image text via OCR, tool response).",
      "For each attack, define what 'success' looks like for the attacker (exfil, off-task action, refusal of safe request).",
      "Run the agent with injections planted in retrieved/tool data.",
      "Score: detection rate (agent flags it) + execution rate (agent obeys it).",
      "Add every observed prod injection to the corpus; refresh from public lists.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface Attack {
  id: string;
  channel: "html_hidden" | "comment" | "base64" | "image_ocr" | "tool_resp";
  payload: string;
  successCondition: (response: string, history: Message[]) => boolean;
}

export async function evalInjection(attack: Attack, agent: Agent) {
  const polluted = injectIntoContext(attack);
  const response = await agent.runWithContext(polluted);
  return {
    attackId: attack.id,
    obeyed: attack.successCondition(response.text, response.history),
    flagged: response.flagged === true,
  };
}`,
    },
    diagram: `graph LR
  ATTACK[Injection corpus<br/>5 channels] --> POLLUTE[Inject into context]
  POLLUTE --> AGENT[Agent under test]
  AGENT --> SCORE[Detection + execution rates]
  SCORE --> GATE{Execution = 0?}
  GATE -->|no| BLOCK[Block release]
  GATE -->|yes| PASS[Pass]`,
    acceptanceThreshold: "Execution rate = 0% (every attack must be neutralized); detection rate ≥ 80%.",
    pitfalls: [
      { trap: "Tests only English-language injections", fix: "Include multilingual, leetspeak, and unicode-confusable variants." },
      { trap: "Once-and-done eval", fix: "Injection landscape evolves weekly; refresh corpus monthly." },
    ],
    conceptsApplied: ["prompt-injection", "camel", "capability-token", "red-team"],
    relatedRecipes: ["jailbreak-resistance", "pii-leakage", "safety-guardrail-adherence"],
    readNext: ["10.1", "10.2", "10.3"],
  },
  {
    id: "jailbreak-resistance",
    title: "Jailbreak resistance eval",
    subArea: "safety",
    complexity: "advanced",
    whenToUse: "Any consumer-facing or unauthenticated agent — adversarial users will try.",
    whatItMeasures: "Whether known jailbreak techniques (DAN-style, role-play, gradual escalation) successfully bypass safety prompting.",
    setup: [
      "Pull 100+ known jailbreaks from public lists (e.g., JailbreakBench) + add 20 hand-crafted for your domain.",
      "Run each jailbreak as the user input; capture the agent's response.",
      "Score response as safe | leaked-partial | leaked-full using LLM judge with a domain-specific rubric.",
      "Track success rate weekly; alert on any leaked-full.",
      "Add every successful jailbreak to the regression set.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `const JailbreakVerdict = z.enum(["safe", "partial", "leaked"]);

export async function evalJailbreaks(jailbreaks: string[], agent: Agent) {
  const results = [];
  for (const jb of jailbreaks) {
    const r = await agent.respond(jb);
    const verdict = await judgeSafety(jb, r.text);
    results.push({ jailbreak: jb.slice(0, 80), verdict });
  }
  const leakRate = results.filter((r) => r.verdict === "leaked").length / results.length;
  return { results, leakRate };
}`,
    },
    diagram: `graph LR
  JBS[100+ known<br/>jailbreaks] --> AGENT[Agent]
  AGENT --> JUDGE[Safety judge]
  JUDGE --> CLS{safe / partial / leaked}
  CLS --> RATE[Leak rate]
  RATE --> ALERT{any leaked?}
  ALERT -->|yes| FIX[Update safety prompt + add to eval]`,
    acceptanceThreshold: "Leak rate (full) = 0%; partial-leak rate ≤ 2%.",
    pitfalls: [
      { trap: "Public jailbreaks are stale", fix: "Augment with hand-crafted domain-specific ones; commission red team periodically." },
      { trap: "Safety judge biased toward the same family", fix: "Cross-family judge; cross-check with humans on borderline cases." },
    ],
    conceptsApplied: ["prompt-injection", "red-team", "camel"],
    relatedRecipes: ["red-team-injection", "safety-guardrail-adherence"],
    readNext: ["10.1", "10.3"],
  },
  {
    id: "pii-leakage",
    title: "PII leakage eval",
    subArea: "safety",
    complexity: "intermediate",
    whenToUse: "Any agent handling user data; non-negotiable for regulated industries (GDPR, HIPAA, PCI).",
    whatItMeasures: "Whether the agent inadvertently echoes, logs, or transmits PII outside intended boundaries.",
    setup: [
      "Build an eval set with planted PII (SSNs, emails, phones, credit cards, medical IDs) in inputs.",
      "After each agent run, scan logs/responses/tool calls with detector regexes + an LLM-judge for paraphrased PII.",
      "Track per-channel leak rate (response, logs, tool calls to external services).",
      "Set zero-tolerance threshold; any leak is a blocker.",
      "Augment with format-preserving variants (SSN with dashes, no dashes, spaces).",
    ],
    codeSnippet: {
      language: "typescript",
      code: `const PII = {
  ssn: /\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b/g,
  email: /\\b[\\w.+-]+@[\\w-]+\\.[\\w.-]+\\b/g,
  phone: /\\b\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b/g,
  ccard: /\\b(?:\\d[ -]*?){13,16}\\b/g,
};
export function detectPII(text: string) {
  const hits: Record<string, string[]> = {};
  for (const [kind, re] of Object.entries(PII)) {
    const m = text.match(re);
    if (m && m.length > 0) hits[kind] = m;
  }
  return hits;
}
export async function scanAllChannels(traces: AgentTrace) {
  return {
    response: detectPII(traces.response),
    logs: detectPII(traces.logs.join("\\n")),
    toolCalls: traces.toolCalls.map((c) => detectPII(JSON.stringify(c.args))),
  };
}`,
    },
    diagram: `graph LR
  PLANTED[Inputs with planted PII] --> AGENT[Agent]
  AGENT --> SCAN[Regex + LLM scan<br/>response · logs · tool calls]
  SCAN --> CHAN[Per-channel leak rate]
  CHAN -->|any leak| BLOCK[Block release]`,
    acceptanceThreshold: "Zero leaks across all channels; any positive triggers immediate investigation.",
    pitfalls: [
      { trap: "Regex misses paraphrased/redacted PII", fix: "Layer LLM-judge over regex; use entity recognition for names." },
      { trap: "PII leaks via verbose error messages", fix: "Scrub at the logging boundary; never trust the agent to redact." },
    ],
    conceptsApplied: ["audit-trail", "capability-token", "camel"],
    relatedRecipes: ["red-team-injection", "safety-guardrail-adherence"],
    readNext: ["10.2", "10.4"],
  },
  {
    id: "hallucination-rate",
    title: "Hallucination rate (free-form)",
    subArea: "safety",
    complexity: "advanced",
    whenToUse: "Any agent producing factual claims without explicit citation (summarization, Q&A without RAG, advice).",
    whatItMeasures: "Fraction of factual claims in agent output that are not verifiable.",
    setup: [
      "Extract atomic factual claims from each output (LLM-judge or rule-based decomposition).",
      "For each claim, attempt verification: against source data if available, else against a trusted knowledge base.",
      "Label each: verified | unsupported | contradicted.",
      "Hallucination rate = (unsupported + contradicted) / total claims.",
      "Calibrate with humans quarterly; track per content type (summaries, code, advice).",
    ],
    codeSnippet: {
      language: "typescript",
      code: `interface Claim { text: string; verdict: "verified" | "unsupported" | "contradicted"; }

export async function hallucinationRate(output: string, sources: string[]): Promise<number> {
  const claims = await extractAtomicClaims(output);
  const verified: Claim[] = [];
  for (const c of claims) {
    const verdict = await verifyClaim(c, sources);
    verified.push({ text: c, verdict });
  }
  const bad = verified.filter((c) => c.verdict !== "verified").length;
  return bad / Math.max(verified.length, 1);
}`,
    },
    diagram: `graph LR
  OUT[Agent output] --> EXTRACT[Extract atomic claims]
  EXTRACT --> VERIFY[Verify per claim<br/>vs sources or KB]
  VERIFY --> RATE[Hallucination rate]
  RATE -->|>= 2%| ALERT[Block + add RAG]
  RATE -->|< 2%| OK[Pass]`,
    acceptanceThreshold: "Hallucination rate ≤ 2% for grounded contexts; ≤ 5% for free-form generation.",
    pitfalls: [
      { trap: "Verifier hallucinates too", fix: "Verifier must have access to ground truth; if unavailable, you can't reliably measure." },
      { trap: "Counting opinion as hallucination", fix: "Separate factual claims from opinions/recommendations in extraction." },
    ],
    conceptsApplied: ["citation-faithfulness", "agentic-rag", "llm-judge"],
    relatedRecipes: ["citation-faithfulness", "llm-judge-rubric"],
    readNext: ["5.5", "8.3"],
  },

  // ─── EVAL OPS (4) ────────────────────────────────────────────────
  {
    id: "eval-set-freshness",
    title: "Eval set freshness & rotation",
    subArea: "ops",
    complexity: "intermediate",
    whenToUse: "Once your eval set is 3+ months old — drift makes it less representative of current prod traffic.",
    whatItMeasures: "How well the eval set still reflects production traffic distribution.",
    setup: [
      "Sample 100 recent prod queries; classify by intent.",
      "Compare intent distribution between current eval set and recent prod sample (chi-square or KL divergence).",
      "If distributions diverge significantly (chi-square p < 0.01), refresh.",
      "Rotation policy: keep 70% stable cases (regression continuity), replace 30% quarterly.",
      "Always add cases from prod incidents — they're the most valuable per case.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `export function intentDistribution(cases: Array<{ intent: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of cases) counts[c.intent] = (counts[c.intent] ?? 0) + 1;
  const total = cases.length;
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / total]));
}

export function klDivergence(p: Record<string, number>, q: Record<string, number>): number {
  const eps = 1e-10;
  return Object.entries(p).reduce((sum, [k, pk]) => {
    const qk = q[k] ?? eps;
    return sum + pk * Math.log(pk / qk);
  }, 0);
}`,
    },
    diagram: `graph LR
  PROD[Recent prod sample] --> DIST_P[Intent distribution]
  EVAL[(Eval set)] --> DIST_E[Intent distribution]
  DIST_P --> KL[KL divergence / chi-sq]
  DIST_E --> KL
  KL -->|diverged| REFRESH[Rotate 30% of cases]
  KL -->|stable| KEEP[Keep set]`,
    acceptanceThreshold: "Eval set intent distribution within 10% of prod per top-5 intents; refresh quarterly.",
    pitfalls: [
      { trap: "Refreshing too aggressively breaks regression continuity", fix: "Always keep a stable 'classic' subset for trend tracking." },
      { trap: "Sampling bias if prod has dominant intent", fix: "Stratify the prod sample by intent before refreshing." },
    ],
    conceptsApplied: ["regression-eval", "calibration-ece"],
    relatedRecipes: ["regression-eval-set", "sample-size-power"],
    readNext: ["8.1"],
  },
  {
    id: "ci-eval-gate",
    title: "CI eval gate (block-on-regression)",
    subArea: "ops",
    complexity: "starter",
    whenToUse: "Every project. The gate that turns 'eval as ritual' into 'eval as guarantee'.",
    whatItMeasures: "Whether the regression eval still passes — and blocks merging if not.",
    setup: [
      "Add a Vitest/pytest suite that runs the regression eval against a mocked LLM (or live, for high-budget projects).",
      "Wire into CI as a required check on PRs.",
      "Set a tolerance: % of cases that may regress vs main branch (typically 0% for golden set).",
      "Output a diff comment on the PR showing newly-failing cases.",
      "Allow manual override for known-acceptable regressions (requires reviewer sign-off).",
    ],
    codeSnippet: {
      language: "yaml",
      code: `# .github/workflows/eval-gate.yml
name: eval-gate
on: pull_request
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm test:eval --reporter=json --outputFile=eval.json
      - name: Compare to baseline
        run: node scripts/compare-eval.js eval.json
      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('eval-diff.md', 'utf8');
            github.rest.issues.createComment({
              owner: context.repo.owner, repo: context.repo.repo,
              issue_number: context.issue.number, body: diff,
            });`,
    },
    diagram: `graph LR
  PR[Pull Request] --> CI[CI workflow]
  CI --> EVAL[Run regression eval]
  EVAL --> CMP[Compare to baseline]
  CMP -->|pass| GREEN[Allow merge]
  CMP -->|regress| COMMENT[Comment failures on PR]
  COMMENT --> BLOCK[Require sign-off]`,
    acceptanceThreshold: "Gate enabled on every PR; required check; zero unauthorized overrides.",
    pitfalls: [
      { trap: "Eval is too slow → people skip it", fix: "Use mocked LLM for fast iterations; live LLM weekly + before release." },
      { trap: "Override becomes a bypass habit", fix: "Track override rate; if > 5% of PRs, the eval is wrong, not the PRs." },
    ],
    conceptsApplied: ["eval-gate", "regression-eval"],
    relatedRecipes: ["regression-eval-set", "prompt-ab-eval"],
    readNext: ["4.5", "8.1"],
  },
  {
    id: "sample-size-power",
    title: "Sample size & statistical power",
    subArea: "ops",
    complexity: "intermediate",
    whenToUse: "Before declaring an A/B winner or accepting a model upgrade — to avoid being fooled by small samples.",
    whatItMeasures: "Minimum number of eval cases needed to detect an effect of given size at given confidence.",
    setup: [
      "Define the minimum effect size you care about (e.g., 5 percentage points).",
      "Pick α=0.05 (false positive rate) and β=0.2 (power 0.8).",
      "For pairwise win-rate comparisons: n ≈ (1.96 + 0.84)² / effect² ≈ 8 / effect² (rough rule).",
      "For accuracy comparison: n ≈ p(1-p) × 16 / (margin)².",
      "Run the test with at least the computed n; if you have fewer cases, widen your confidence interval and don't ship.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `// Minimum N for a two-proportion z-test at alpha=0.05, power=0.8
export function minSampleSize(p1: number, p2: number): number {
  const z_alpha = 1.96, z_beta = 0.84;
  const pBar = (p1 + p2) / 2;
  const numerator = Math.pow(z_alpha * Math.sqrt(2 * pBar * (1 - pBar)) +
                             z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denom = Math.pow(p1 - p2, 2);
  return Math.ceil(numerator / denom);
}
// Example: minSampleSize(0.80, 0.85) -> need ~907 cases per arm for 5pt detection`,
    },
    diagram: `graph LR
  EFFECT[Min effect size<br/>e.g., 5pp] --> CALC[Compute n]
  ALPHA[alpha = 0.05] --> CALC
  POWER[power = 0.8] --> CALC
  CALC --> N[Min cases needed]
  N --> CHECK{Have enough?}
  CHECK -->|yes| TEST[Run A/B]
  CHECK -->|no| MORE[Collect more or widen CI]`,
    acceptanceThreshold: "n ≥ computed minimum for the smallest effect you care about; report 95% CI alongside point estimate.",
    pitfalls: [
      { trap: "Reporting only point estimate (e.g., '5% better')", fix: "Always with CI; '5% (95% CI: -2% to 12%)' tells you it's not significant." },
      { trap: "Running until significance ('peeking')", fix: "Decide n upfront; sequential testing inflates false-positives." },
    ],
    conceptsApplied: ["regression-eval", "calibration-ece"],
    relatedRecipes: ["pairwise-preference", "prompt-ab-eval"],
    readNext: ["8.1", "8.2"],
  },
  {
    id: "prompt-ab-eval",
    title: "Prompt A/B eval",
    subArea: "ops",
    complexity: "intermediate",
    whenToUse: "When iterating on prompts — to know whether a change actually helps or just looks good on a few cherry-picks.",
    whatItMeasures: "Difference in scoring metric between prompt A and prompt B over the same eval set.",
    setup: [
      "Hold all other factors constant: model, temperature, tool set, eval set, scoring code.",
      "Run both prompts on the same N cases (paired test — more statistical power than independent).",
      "Compute paired difference per case; aggregate as mean delta + 95% CI.",
      "For pairwise preference, use the pairwise-preference recipe.",
      "Track in a prompt-versions log so you can roll back.",
    ],
    codeSnippet: {
      language: "typescript",
      code: `export async function abEval(promptA: string, promptB: string, cases: EvalCase[]) {
  const results = await Promise.all(cases.map(async (c) => {
    const [outA, outB] = await Promise.all([runWith(promptA, c), runWith(promptB, c)]);
    return {
      caseId: c.id,
      scoreA: await score(outA, c.expected),
      scoreB: await score(outB, c.expected),
    };
  }));
  const deltas = results.map((r) => r.scoreB - r.scoreA);
  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const se = Math.sqrt(deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / (deltas.length - 1) / deltas.length);
  return { mean, ci95: [mean - 1.96 * se, mean + 1.96 * se] };
}`,
    },
    diagram: `graph LR
  CASES[Same eval set] --> A[Run prompt A]
  CASES --> B[Run prompt B]
  A --> DELTA[Paired delta per case]
  B --> DELTA
  DELTA --> MEAN[Mean + 95% CI]
  MEAN --> DECIDE{CI excludes 0?}
  DECIDE -->|yes, B better| PROMOTE[Promote B]
  DECIDE -->|no| KEEP[Keep A]`,
    acceptanceThreshold: "Mean improvement positive AND 95% CI lower bound > 0; minimum n from sample-size-power recipe.",
    pitfalls: [
      { trap: "Changing two things at once (prompt + temperature)", fix: "One variable per A/B; isolate effects." },
      { trap: "Cherry-picking the eval set to favor new prompt", fix: "Use the standard regression set; if you augment, add to both arms equally." },
    ],
    conceptsApplied: ["regression-eval", "llm-judge"],
    relatedRecipes: ["pairwise-preference", "sample-size-power", "ci-eval-gate"],
    readNext: ["8.1", "4.5"],
  },
];

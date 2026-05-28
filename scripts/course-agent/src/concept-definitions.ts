/**
 * Per-concept reference data: one-paragraph definition + prereqs + related.
 * Used by the `concepts` stage to generate the book's concept reference pages.
 *
 * Keys must match concept_id in scripts/capstones/src/scorer/concepts-seed.ts.
 */

export interface ConceptDefinition {
  definition: string;     // 2-4 sentences, plain English
  prereqs: string[];      // concept_ids that should be learned first
  related: string[];      // concept_ids that are commonly used together
  lessons: string[];      // lesson IDs (e.g. ["1.1", "4.2"]) that cover this
}

export const CONCEPT_DEFINITIONS: Record<string, ConceptDefinition> = {
  // ─── M1 Foundations ─────────────────────────────────────────────────
  "agency-dial": {
    definition: "A 5-level scale (0–4) from 'no agency' (pure chatbot) to 'fully autonomous' (self-directed goal pursuit). Used to right-size system complexity to the task — most production systems sit at level 1–2 and lose money trying to climb higher.",
    prereqs: [],
    related: ["five-question-framework", "paradigms"],
    lessons: ["1.1", "1.2"],
  },
  "five-question-framework": {
    definition: "A pre-design checklist: (1) What's the input? (2) What's the success measure? (3) What tools? (4) What's the failure mode? (5) Who owns the bill? If you can't answer all five, you're not ready to build an agent.",
    prereqs: ["agency-dial"],
    related: ["roi-model", "build-vs-buy"],
    lessons: ["1.2"],
  },
  "paradigms": {
    definition: "The four canonical agent loop shapes — ReAct (think→act→observe), Reflexion (self-critique), Plan-and-Solve (decompose first, execute second), and CodeAct (emit code as the action). Choosing the right paradigm at design time saves 80% of debugging downstream.",
    prereqs: ["react-loop"],
    related: ["sherpa-v1", "sherpa-v4"],
    lessons: ["1.3", "1.4"],
  },
  "react-loop": {
    definition: "Thought → Action → Observation → Thought... The atomic loop of every modern agent. The model emits a thought (chain-of-reasoning), picks an action (tool call), observes the result, and repeats until done or budget exhausted.",
    prereqs: [],
    related: ["paradigms", "sherpa-v1", "strict-tool-use"],
    lessons: ["1.3"],
  },

  // ─── M2 Math ────────────────────────────────────────────────────────
  "pomdp": {
    definition: "Partially Observable Markov Decision Process — the formal model for agents that don't fully see the world. Defined by states, actions, observations, transitions, and rewards. Every real agent is a POMDP whether or not you write it down.",
    prereqs: [],
    related: ["belief-state", "evoi"],
    lessons: ["2.1"],
  },
  "belief-state": {
    definition: "A probability distribution over hidden world states, updated each turn by Bayes Rule. The agent acts on its belief, not the (unknown) ground truth. Belief-state thinking explains why agents loop, hesitate, and probe.",
    prereqs: ["pomdp", "bayes-rule"],
    related: ["evoi", "entropy"],
    lessons: ["2.2"],
  },
  "evoi": {
    definition: "Expected Value of Information — the dollar value of asking a question or making a tool call, computed as the expected improvement in decision quality minus the cost of the call. The math behind 'should I search more or just answer?'",
    prereqs: ["belief-state", "entropy"],
    related: ["eig-per-dollar"],
    lessons: ["2.3"],
  },
  "bayes-rule": {
    definition: "P(state|obs) ∝ P(obs|state) · P(state). The single equation that updates belief from evidence. In agent design, the 'prior' is your system prompt; the 'likelihood' is what tools return.",
    prereqs: [],
    related: ["belief-state", "pomdp"],
    lessons: ["2.2"],
  },
  "entropy": {
    definition: "H(p) = −Σ p·log(p). Measures uncertainty in bits. Mutual information I(X;Y) measures how much one variable tells you about another — the basis of EVoI and active learning policies.",
    prereqs: [],
    related: ["evoi", "eig-per-dollar"],
    lessons: ["2.3"],
  },
  "eig-per-dollar": {
    definition: "Expected Information Gain divided by tool cost. The right metric to rank candidate tool calls when the budget is finite. Cheap calls that resolve uncertainty win over expensive calls that barely move belief.",
    prereqs: ["evoi", "entropy"],
    related: [],
    lessons: ["2.3", "2.4"],
  },

  // ─── M3 LLM Internals ───────────────────────────────────────────────
  "strict-tool-use": {
    definition: "Forcing the model to emit only valid tool-call JSON via grammar-constrained decoding. Eliminates the 'oops the model invented a tool' class of bugs. Every production agent should use it.",
    prereqs: ["react-loop"],
    related: ["constrained-decoding", "tool-use-claude"],
    lessons: ["3.3", "3.4"],
  },
  "constrained-decoding": {
    definition: "Restricting next-token sampling to those that satisfy a grammar (regex, JSON Schema, or finite-state machine). Implemented as a token-level mask over the logits. Underlies strict tool use and structured output.",
    prereqs: [],
    related: ["strict-tool-use"],
    lessons: ["3.3"],
  },
  "seven-block-prompt": {
    definition: "A standardized prompt layout — role · context · task · constraints · examples · output format · safety. Reduces prompt-injection surface, simplifies eval, and makes prompts diff-friendly across versions.",
    prereqs: [],
    related: ["prompt-cache", "prompt-injection"],
    lessons: ["3.1", "3.2"],
  },
  "prompt-cache": {
    definition: "Reusing the KV-cache for a stable prompt prefix across requests. Cuts time-to-first-token by ~5x and input cost by ~90% on the cached portion. The single biggest cost lever for production agents.",
    prereqs: ["seven-block-prompt"],
    related: ["cache-control", "prompt-cache-prod"],
    lessons: ["3.5"],
  },

  // ─── M4 Single-Agent Sherpa ─────────────────────────────────────────
  "sherpa-v1": {
    definition: "The reference implementation of a plain ReAct agent. Six tools, no memory, no reflection — the 'hello world' you compare every fancier design against.",
    prereqs: ["react-loop"],
    related: ["sherpa-v2", "sherpa-v5"],
    lessons: ["4.1"],
  },
  "sherpa-v2": {
    definition: "Sherpa v1 + three memory tiers (scratchpad · session · long-term vector store). Demonstrates when memory helps (multi-turn) and when it hurts (single-shot tasks).",
    prereqs: ["sherpa-v1", "vector-store"],
    related: ["memory-compaction"],
    lessons: ["4.2"],
  },
  "sherpa-v3": {
    definition: "Sherpa v2 + a Reflexion-style self-critique step after each major decision. Improves on hard tasks but doubles cost — not always worth it.",
    prereqs: ["sherpa-v2"],
    related: ["self-improvement"],
    lessons: ["4.3"],
  },
  "sherpa-v4": {
    definition: "Sherpa v3 + explicit Plan-and-Solve decomposition before execution. Best when tasks have ≥ 5 sub-steps and the plan itself is the deliverable.",
    prereqs: ["sherpa-v3", "paradigms"],
    related: ["sherpa-v5"],
    lessons: ["4.4"],
  },
  "sherpa-v5": {
    definition: "The production hybrid — ReAct for simple turns, Plan-and-Solve for complex ones, Reflexion only on failures, memory only when needed. The pattern most real systems converge to.",
    prereqs: ["sherpa-v4"],
    related: ["eval-gate"],
    lessons: ["4.5"],
  },
  "eval-gate": {
    definition: "A CI check that blocks merges if the regression eval set drops below a threshold. The discipline that turns 'agent demo' into 'agent that ships'.",
    prereqs: [],
    related: ["regression-eval", "llm-judge"],
    lessons: ["4.5", "8.1"],
  },

  // ─── M5 Memory & RAG ────────────────────────────────────────────────
  "vector-store": {
    definition: "An ANN index (HNSW, IVF, or PQ) over embedding vectors. Returns nearest neighbors in O(log N). The retrieval substrate underneath every RAG system.",
    prereqs: [],
    related: ["hybrid-retrieval", "agentic-rag"],
    lessons: ["5.1"],
  },
  "hybrid-retrieval": {
    definition: "Combining dense vector search (semantic) with sparse BM25 (lexical) and a reranker. Recovers exact-match precision that pure dense search loses on rare terms.",
    prereqs: ["vector-store"],
    related: ["agentic-rag", "citation-faithfulness"],
    lessons: ["5.2"],
  },
  "agentic-rag": {
    definition: "RAG where the model decides what and when to retrieve, performs multiple hops, and reformulates queries between hops. Outperforms single-shot RAG on complex questions but costs 3–5x more.",
    prereqs: ["hybrid-retrieval", "react-loop"],
    related: ["citation-faithfulness", "citations-api"],
    lessons: ["5.4"],
  },
  "memory-compaction": {
    definition: "Periodically summarizing scratchpad/conversation memory into a smaller representation so context stays under budget. Naive truncation drops information; compaction preserves it.",
    prereqs: ["sherpa-v2"],
    related: ["prompt-cache"],
    lessons: ["5.3"],
  },
  "citation-faithfulness": {
    definition: "The fraction of model claims that can be verified against the cited source. The headline eval metric for any retrieval-grounded system. Target ≥ 80% before shipping.",
    prereqs: ["agentic-rag"],
    related: ["citations-api", "regression-eval"],
    lessons: ["5.5", "8.2"],
  },

  // ─── M6 Multi-Agent ─────────────────────────────────────────────────
  "orchestrator-worker": {
    definition: "One agent (orchestrator) decomposes the task and dispatches sub-tasks to specialized worker agents. The default multi-agent pattern. Costs more than single-agent but parallelizes well.",
    prereqs: ["sherpa-v5"],
    related: ["specialist-supervisor", "handoff-schema"],
    lessons: ["6.1"],
  },
  "specialist-supervisor": {
    definition: "Inverted orchestrator — a lightweight supervisor routes each query to the most relevant specialist agent. Lower latency than orchestrator-worker but worse on multi-skill tasks.",
    prereqs: ["orchestrator-worker"],
    related: ["handoff-schema"],
    lessons: ["6.2"],
  },
  "handoff-schema": {
    definition: "A typed (Zod / JSON Schema) contract for what one agent passes to another. The thing that separates 'multi-agent system' from 'pile of prompts'. Validate at every boundary.",
    prereqs: [],
    related: ["orchestrator-worker", "strict-tool-use"],
    lessons: ["6.3"],
  },
  "debate": {
    definition: "Multiple agents argue toward consensus or majority-vote on an answer. Improves accuracy ~5% on reasoning benchmarks at 3–5x cost. Rarely worth it in production.",
    prereqs: ["orchestrator-worker"],
    related: [],
    lessons: ["6.4"],
  },

  // ─── M7 Tools & MCP ─────────────────────────────────────────────────
  "mcp-server": {
    definition: "Model Context Protocol server — a standardized way to expose tools, resources, and prompts to any MCP-compatible client (Claude Desktop, Claude Code, etc.). Lets you ship one tool implementation that works everywhere.",
    prereqs: ["strict-tool-use"],
    related: ["tool-registry", "capability-token"],
    lessons: ["7.1", "7.2"],
  },
  "tool-registry": {
    definition: "A central catalog of available tools with their schemas, descriptions, and permissions. Enables runtime tool selection, deprecation, and access control.",
    prereqs: ["mcp-server"],
    related: ["capability-token"],
    lessons: ["7.3"],
  },
  "sandbox": {
    definition: "Isolated runtime (Docker, Firecracker, E2B) for executing untrusted code or commands. Without it, CodeAct agents are a security liability.",
    prereqs: [],
    related: ["capability-token", "computer-use"],
    lessons: ["7.4"],
  },
  "capability-token": {
    definition: "A scoped, signed token that grants an agent permission to call exactly one resource for a limited time. Replaces 'tool has root' with 'tool has just enough'.",
    prereqs: ["mcp-server"],
    related: ["camel", "prompt-injection"],
    lessons: ["7.4", "10.3"],
  },

  // ─── M8 Eval & Observability ────────────────────────────────────────
  "regression-eval": {
    definition: "A frozen set of input → expected-output pairs run on every code change to catch regressions. The single most important investment in agent reliability.",
    prereqs: [],
    related: ["eval-gate", "llm-judge"],
    lessons: ["8.1"],
  },
  "calibration-ece": {
    definition: "Expected Calibration Error — how well the model's stated confidence matches its actual accuracy. Uncalibrated agents either hedge constantly or assert wrongly.",
    prereqs: [],
    related: ["llm-judge"],
    lessons: ["8.2"],
  },
  "llm-judge": {
    definition: "Using a (usually larger) model to grade outputs of another model along defined rubrics. Cheaper than human grading; harder to trust on subjective criteria.",
    prereqs: ["regression-eval"],
    related: ["calibration-ece"],
    lessons: ["8.3"],
  },
  "observability-spans": {
    definition: "OpenTelemetry-style structured traces around every LLM call, tool call, and agent loop iteration. Makes 'why did the agent do that?' a 30-second question, not a 30-minute one.",
    prereqs: [],
    related: ["runbooks"],
    lessons: ["8.4"],
  },

  // ─── M9 Production Engineering ──────────────────────────────────────
  "durable-execution": {
    definition: "Agent state persisted to a checkpoint store after every step, so a crash can be resumed without re-running expensive LLM calls. Pattern: Temporal, Inngest, or hand-rolled with Postgres.",
    prereqs: [],
    related: ["retry-idempotency", "runbooks"],
    lessons: ["9.1"],
  },
  "retry-idempotency": {
    definition: "Retry transient failures with exponential backoff + jitter; design tool calls so re-execution is safe. The two patterns that make agents survive flaky networks.",
    prereqs: [],
    related: ["durable-execution"],
    lessons: ["9.2"],
  },
  "prompt-cache-prod": {
    definition: "Three-tier caching in production: prompt cache (KV-cache reuse) + semantic cache (embedding-similar prompts) + model cache (memoize tool results). Together: 5–10x cost reduction.",
    prereqs: ["prompt-cache"],
    related: ["cache-control"],
    lessons: ["9.3"],
  },
  "runbooks": {
    definition: "Pre-written response playbooks for known failure modes (rate-limited, model down, tool returns garbage). The difference between a 2 AM page and a 2 AM auto-recovery.",
    prereqs: ["observability-spans"],
    related: ["durable-execution"],
    lessons: ["9.4"],
  },

  // ─── M10 Safety, Alignment & Security ───────────────────────────────
  "prompt-injection": {
    definition: "An attacker embedding instructions in tool output, retrieved documents, or user input to hijack the agent. The #1 production security risk. Mitigated by privilege separation, not prompting.",
    prereqs: [],
    related: ["camel", "capability-token"],
    lessons: ["10.1", "10.2"],
  },
  "camel": {
    definition: "Capability-Mediated LLM — a privilege-separation pattern where a trusted planner agent decides what to do, and an isolated executor agent (with no access to system tools) runs each step. Prevents injection escalation.",
    prereqs: ["prompt-injection", "capability-token"],
    related: ["audit-trail"],
    lessons: ["10.2"],
  },
  "red-team": {
    definition: "Adversarial testing campaigns that probe for jailbreaks, injection, and unsafe outputs before launch. The eval set you build *and then keep iterating on*.",
    prereqs: ["regression-eval"],
    related: ["prompt-injection"],
    lessons: ["10.3"],
  },
  "audit-trail": {
    definition: "Append-only log of every agent decision (input, tools called, output, model version, prompt hash). Required for SR 11-7 (banking) and EU AI Act compliance. Build it from day one.",
    prereqs: ["observability-spans"],
    related: ["governance"],
    lessons: ["10.4"],
  },

  // ─── M11 Business Cases ─────────────────────────────────────────────
  "roi-model": {
    definition: "A spreadsheet that translates agent capability into dollars saved/earned, with sensitivity bands on the three biggest uncertainties (volume, cost-per-call, success rate). No model → no funding.",
    prereqs: [],
    related: ["build-vs-buy", "change-mgmt"],
    lessons: ["11.1"],
  },
  "build-vs-buy": {
    definition: "Framework for choosing between custom-built agents and vendor offerings on four axes: data sensitivity, customization depth, time-to-value, total cost of ownership.",
    prereqs: ["roi-model"],
    related: [],
    lessons: ["11.2"],
  },
  "change-mgmt": {
    definition: "A 4-phase rollout: shadow mode → assist mode → auto with human review → auto. Skipping phases is how 'pilot success' becomes 'production rollback'.",
    prereqs: [],
    related: ["roi-model"],
    lessons: ["11.3"],
  },

  // ─── M12 Advanced Designs ───────────────────────────────────────────
  "self-improvement": {
    definition: "Prompt-level self-improvement: the agent maintains a 'lessons learned' memory and prepends relevant past mistakes to its system prompt. Cheaper than fine-tuning, often as effective.",
    prereqs: ["sherpa-v3"],
    related: ["dpo-rollouts"],
    lessons: ["12.1"],
  },
  "dpo-rollouts": {
    definition: "Direct Preference Optimization on collected agent trajectories. Distills 'good behavior' from rollouts where the outcome was rated positive. A fine-tuning lever rather than a prompting one.",
    prereqs: ["self-improvement"],
    related: ["lora-adapters"],
    lessons: ["12.2"],
  },
  "lora-adapters": {
    definition: "Low-Rank Adaptation — train tiny adapter matrices instead of full model weights. Lets you ship per-tenant or per-task model specializations cheaply. Less relevant when using a closed-weight provider.",
    prereqs: [],
    related: ["dpo-rollouts"],
    lessons: ["12.3"],
  },

  // ─── M13 Frontier ───────────────────────────────────────────────────
  "capability-frontier": {
    definition: "A structured forecast of what frontier models will be able to do in 1–3 years (long-horizon planning, true multimodal action, persistent memory). Used to plan investments without betting on hype.",
    prereqs: [],
    related: ["governance"],
    lessons: ["13.1"],
  },
  "governance": {
    definition: "The intersection of SR 11-7 (banking model risk), EU AI Act (risk-tiered obligations), and NIST AI RMF. Determines what documentation, monitoring, and approval flow you need before deployment.",
    prereqs: ["audit-trail"],
    related: [],
    lessons: ["13.2", "13.3"],
  },

  // ─── M14 Claude-Specific Architect ──────────────────────────────────
  "messages-api": {
    definition: "Anthropic's primary API surface. Requests are arrays of message turns; responses are arrays of content blocks (text, tool_use, thinking, image, document). Streaming uses Server-Sent Events with delta events per block.",
    prereqs: [],
    related: ["tool-use-claude", "vision-pdf-native"],
    lessons: ["14.1"],
  },
  "tool-use-claude": {
    definition: "Claude's tool-use protocol: declare tools with input_schema (JSON Schema), set tool_choice (auto/any/tool/none), receive tool_use blocks, return tool_result blocks. Supports parallel tool calls in a single turn.",
    prereqs: ["messages-api", "strict-tool-use"],
    related: ["computer-use", "mcp-server"],
    lessons: ["14.1"],
  },
  "cache-control": {
    definition: "Mark up to 4 prompt-prefix breakpoints with `cache_control: {type: 'ephemeral'}` to cache that portion server-side. TTL defaults to 5 min; 1-hour available. Cached input = 10% of normal price; cache writes = 125%.",
    prereqs: ["messages-api", "prompt-cache"],
    related: ["prompt-cache-prod"],
    lessons: ["14.2"],
  },
  "extended-thinking": {
    definition: "Enable internal reasoning blocks (thinking type) with a `budget_tokens` cap. Blocks may be redacted when they contain sensitive content. Improves accuracy on math, code, multi-step problems — at the cost of latency and output tokens.",
    prereqs: ["messages-api"],
    related: ["model-tier-routing"],
    lessons: ["14.3"],
  },
  "model-tier-routing": {
    definition: "Pick the smallest model that meets your quality bar — Haiku (cheap/fast), Sonnet (balanced), Opus (hardest tasks). Patterns: cascade (try Haiku first, escalate on low confidence) or pre-classify (route by query type).",
    prereqs: ["messages-api"],
    related: ["batch-api", "rate-limit-tiers"],
    lessons: ["14.3"],
  },
  "vision-pdf-native": {
    definition: "Pass images (base64 or URL) and PDFs (up to 32 MB, 100 pages) as content blocks. Native PDF means the model sees the rendered pages, not extracted text — preserves tables, charts, layout.",
    prereqs: ["messages-api"],
    related: ["citations-api"],
    lessons: ["14.4"],
  },
  "citations-api": {
    definition: "Set `citations: {enabled: true}` on document blocks to get back machine-readable citations pointing to specific page/character ranges. The grounded-output primitive — pair it with retrieval for verifiable answers.",
    prereqs: ["messages-api", "vision-pdf-native"],
    related: ["agentic-rag", "citation-faithfulness"],
    lessons: ["14.4"],
  },
  "computer-use": {
    definition: "Beta capability where Claude takes screenshots and emits mouse/keyboard actions through a sandboxed virtual machine. Treat as research-grade — slow, brittle, and dangerous without a sandbox.",
    prereqs: ["tool-use-claude", "sandbox"],
    related: [],
    lessons: ["14.4"],
  },
  "batch-api": {
    definition: "Submit up to 100K requests per batch; results within 24h at 50% of the per-request price. Use for evals, backfills, and bulk content generation. Cannot stream; cannot use for interactive flows.",
    prereqs: ["messages-api"],
    related: ["rate-limit-tiers", "model-tier-routing"],
    lessons: ["14.5"],
  },
  "rate-limit-tiers": {
    definition: "Three independent limits — ITPM (input tokens/min), OTPM (output tokens/min), RPM (requests/min) — scaling with usage tier. Capacity planning means tracking all three against forecast traffic + safety headroom.",
    prereqs: ["messages-api"],
    related: ["batch-api", "durable-execution"],
    lessons: ["14.5"],
  },
};

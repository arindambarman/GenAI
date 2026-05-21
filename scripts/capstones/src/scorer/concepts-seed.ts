import type { ConceptScore } from "./schema.js";

/**
 * The 53 course concepts (from the knowledge graph) as seed data.
 * Used by `scorer init` to bootstrap a fresh progress.json.
 *
 * Each concept starts at depth=0, confidence=0 — "unstarted" status.
 * Update via `scorer rate <id> --depth N --confidence N`.
 */
export const SEED_CONCEPTS: Array<Omit<ConceptScore, "review_history" | "evidence"> & { review_history?: never; evidence?: never }> = [
  // ─── M1 Foundations ──────────────────────────────────────────────
  { concept_id: "agency-dial", name: "Agency Dial (0-4)", module: "M1", category: "foundational", importance: 10, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "five-question-framework", name: "5-Question Framework", module: "M1", category: "foundational", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "paradigms", name: "ReAct / Reflexion / PaS / CodeAct", module: "M1", category: "foundational", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "react-loop", name: "ReAct Loop (TAO)", module: "M1", category: "foundational", importance: 9, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M2 Math ─────────────────────────────────────────────────────
  { concept_id: "pomdp", name: "POMDP", module: "M2", category: "math", importance: 10, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "belief-state", name: "Belief State", module: "M2", category: "math", importance: 10, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "evoi", name: "Expected Value of Information", module: "M2", category: "math", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "bayes-rule", name: "Bayes Rule / Prior Encoding", module: "M2", category: "math", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "entropy", name: "Entropy / Mutual Information", module: "M2", category: "math", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "eig-per-dollar", name: "EIG per Dollar", module: "M2", category: "math", importance: 8, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M3 LLM Internals ────────────────────────────────────────────
  { concept_id: "strict-tool-use", name: "Strict Tool Use (Constrained Decoding)", module: "M3", category: "architecture", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "constrained-decoding", name: "Constrained Decoding (FSM over grammar)", module: "M3", category: "architecture", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "seven-block-prompt", name: "7-Block Prompt Structure", module: "M3", category: "architecture", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "prompt-cache", name: "Prompt Cache", module: "M3", category: "operational", importance: 8, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M4 Single-Agent Sherpa ──────────────────────────────────────
  { concept_id: "sherpa-v1", name: "Sherpa v1 (ReAct)", module: "M4", category: "architecture", importance: 10, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "sherpa-v2", name: "Sherpa v2 (Memory Tiers)", module: "M4", category: "architecture", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "sherpa-v3", name: "Sherpa v3 (Reflection)", module: "M4", category: "architecture", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "sherpa-v4", name: "Sherpa v4 (Plan-and-Solve)", module: "M4", category: "architecture", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "sherpa-v5", name: "Sherpa v5 (Production hybrid)", module: "M4", category: "architecture", importance: 10, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "eval-gate", name: "Eval Gate (CI)", module: "M4", category: "operational", importance: 9, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M5 Memory & RAG ─────────────────────────────────────────────
  { concept_id: "vector-store", name: "Vector Store (HNSW/IVF/PQ)", module: "M5", category: "architecture", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "hybrid-retrieval", name: "Hybrid Retrieval (Dense + BM25 + Rerank)", module: "M5", category: "architecture", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "agentic-rag", name: "Agentic RAG (multi-hop)", module: "M5", category: "architecture", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "memory-compaction", name: "Memory Compaction", module: "M5", category: "architecture", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "citation-faithfulness", name: "Citation Faithfulness", module: "M5", category: "operational", importance: 9, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M6 Multi-Agent ──────────────────────────────────────────────
  { concept_id: "orchestrator-worker", name: "Orchestrator-Worker", module: "M6", category: "architecture", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "specialist-supervisor", name: "Specialist Supervisor", module: "M6", category: "architecture", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "handoff-schema", name: "Typed Handoff Schemas", module: "M6", category: "architecture", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "debate", name: "Multi-Agent Debate / Consensus", module: "M6", category: "architecture", importance: 6, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M7 Tools & MCP ──────────────────────────────────────────────
  { concept_id: "mcp-server", name: "MCP Server", module: "M7", category: "architecture", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "tool-registry", name: "Tool Registry", module: "M7", category: "architecture", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "sandbox", name: "Sandbox (Docker/Firecracker/E2B)", module: "M7", category: "safety", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "capability-token", name: "Capability Tokens", module: "M7", category: "safety", importance: 7, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M8 Eval & Observability ─────────────────────────────────────
  { concept_id: "regression-eval", name: "Regression Eval Set", module: "M8", category: "operational", importance: 10, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "calibration-ece", name: "Calibration / ECE", module: "M8", category: "operational", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "llm-judge", name: "LLM as Judge", module: "M8", category: "operational", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "observability-spans", name: "Observability Spans", module: "M8", category: "operational", importance: 8, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M9 Production Engineering ───────────────────────────────────
  { concept_id: "durable-execution", name: "Durable Execution", module: "M9", category: "operational", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "retry-idempotency", name: "Retry + Idempotency", module: "M9", category: "operational", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "prompt-cache-prod", name: "Caching Tiers (Prompt + Semantic + Model)", module: "M9", category: "operational", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "runbooks", name: "Runbooks + Degradation Modes", module: "M9", category: "operational", importance: 8, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M10 Safety, Alignment & Security ────────────────────────────
  { concept_id: "prompt-injection", name: "Prompt Injection (defenses)", module: "M10", category: "safety", importance: 10, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "camel", name: "CaMeL Privilege Separation", module: "M10", category: "safety", importance: 9, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "red-team", name: "Red Team Campaigns", module: "M10", category: "safety", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "audit-trail", name: "Audit Trail (SR 11-7 / EU AI Act)", module: "M10", category: "safety", importance: 9, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M11 Business Cases ──────────────────────────────────────────
  { concept_id: "roi-model", name: "ROI Model + Sensitivity Analysis", module: "M11", category: "business", importance: 8, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "build-vs-buy", name: "Build vs Buy (vendor evaluation)", module: "M11", category: "business", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "change-mgmt", name: "Change Management (4-phase rollout)", module: "M11", category: "business", importance: 8, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M12 Advanced Designs ────────────────────────────────────────
  { concept_id: "self-improvement", name: "Self-Improvement (prompt-level)", module: "M12", category: "frontier", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "dpo-rollouts", name: "DPO on Agent Rollouts", module: "M12", category: "frontier", importance: 5, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "lora-adapters", name: "LoRA Adapters", module: "M12", category: "frontier", importance: 5, depth: 0, confidence: 0, last_reviewed: null },

  // ─── M13 Frontier ────────────────────────────────────────────────
  { concept_id: "capability-frontier", name: "Capability Frontier (3-year horizon)", module: "M13", category: "frontier", importance: 6, depth: 0, confidence: 0, last_reviewed: null },
  { concept_id: "governance", name: "Governance Frameworks (SR 11-7 / EU AI Act / NIST)", module: "M13", category: "frontier", importance: 7, depth: 0, confidence: 0, last_reviewed: null },
];

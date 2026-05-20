# Concept Flow Tables — All 13 Modules

53 numbered concepts. Numbers reference the boxes in [concept-flow.svg](concept-flow.svg) and the nodes in [knowledge-graph.svg](knowledge-graph.svg).

Legend:
- **Connection/relationship** uses → for "depends on / uses", → for downstream concept, and bridges (#N) cross-module.
- **Business Scenario** is the specific case-study scenario used in the course where the concept is taught (HSBC / Helix / Acme).

---

## Module 1 — Foundations & Mental Models

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **1** | **Agency Dial (0-4)** | Continuous measure of how much decision-making the LLM owns: 0 = scripted, 4 = fully autonomous. The single unifying mental model of the course. | HSBC mid-office: Priya evaluates 3 vendors (BotForce/PredictML/Lumen). Each corresponds to a different dial setting. | → **#2** (use the dial to choose architecture) · → **#15** (Sherpa picks dial 3) · spine bridge to every module |
| **2** | **Workflow vs Pipeline vs Agent** | Three architectural shapes, with a 5-question framework (input enumerable? sequence pre-knowable? failure cost? time budget? ambiguity?) for choosing. | Acme support: Ronnie has 2 backlogs (refunds = workflow; weird escalations = agent). | uses **#1** · → **#3** (paradigms apply when choosing agent) |
| **3** | **Agent Paradigms (ReAct/Reflexion/PaS/CodeAct)** | The four main LLM-agent loop structures with different cost/quality/latency profiles. | Helix: Maya's intern built all 4 versions — Tom needs an architectural answer. | uses **#1, #2** · → **#4** (ReAct is the simplest) · → **#15-19** (Sherpa picks per-task) |
| **4** | **ReAct Loop** | Thought → Action → Observation → Answer loop. The baseline LLM-agent architecture and namesake of the pattern. | HSBC: Sherpa's classification loop on cross-border SWIFT breaks. | specializes **#3** · → **#15** (Sherpa v1 implements it) · cross-bridge to **#5, #6** (POMDP frame) |

---

## Module 2 — Mathematical Foundations

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **5** | **POMDP** | Partially Observable MDP — agent never sees state directly, only observations. The right formalism for LLM agents. | HSBC: Daniel asks for a principled budget on Sherpa's tool calls. | extends MDP · → **#6** (belief is the POMDP state) · cross-bridge to **#15** (Sherpa is a POMDP solver) |
| **6** | **Belief State** | Probability distribution over latent states. The "knowledge state" of the agent. Updated via Bayes after each observation. | HSBC: Sherpa's confidence over break classes after each tool call. | uses **#5, #7** · → **#8** (EVoI is over beliefs) · cross-bridge to **#16** (memory = implicit belief) |
| **7** | **Belief Update (Bayes Rule)** | b'(s') ∝ Ω(o|s',a) · Σ T(s'|s,a) b(s). The central equation of POMDP theory; LLM agents do this implicitly via context. | Acme: support agent that ignores priors issues wrong refund. | foundation for **#6, #8** · cross-bridge to **#13** (encoded in prompts) |
| **8** | **EVoI (Expected Value of Information)** | E[V(b'_o)] − V(b) − c(a). Stop when no action's EVoI > 0. The math behind agent termination. | HSBC: Daniel needs a principled "when to stop" rule. | uses **#6, #7** · cross-bridge to **#20** (derives Sherpa's `confidence > 0.83`) |
| **9** | **Entropy / Mutual Information** | H(X) = uncertainty in bits; I(X;Y) = how much Y tells about X. Foundation of all information-theoretic agent metrics. | HSBC: Sherpa choosing which tool to call has highest info gain. | → **#10** (EIG combines MI with cost) · cross-bridge to **#35** (KL for calibration) |
| **10** | **EIG per Dollar** | Expected information gain ÷ tool cost. Principled tool ranking the agent can be prompted to approximate. | HSBC: 4 tools with different costs — rank by EIG/$. | uses **#9** · cross-bridge to **#31** (ranks tools in registry) |

---

## Module 3 — LLM Internals for Agents

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **11** | **Strict Tool Use** | Constrained decoding at sampling time — model cannot emit hallucinated tool names or invalid arguments. | Helix: Tom's agent hallucinated `search_pubmed_advanced` 4 times. | → **#12** (uses constrained decoding) · cross-bridge to **#15, #30** (everyone uses this) |
| **12** | **Constrained Decoding** | FSM/grammar over the JSON schema restricts legal next tokens to those that keep the output valid. | Acme: Lin's classifier emitted "around $50-75 maybe" instead of a number. | underpins **#11** · → **#33** (capability tokens enforce structurally) |
| **13** | **7-Block Prompt Structure** | Role / Mission / Priorities / Tools / Constraints / Examples / Output — survives model upgrades. | All 3 orgs: refactoring a 12K-token monolith. | cross-bridge to **#15** (Sherpa's system prompt) · packages **#7** as priors |
| **14** | **Prompt Cache** | Provider caches stable prefixes; 10× cheaper than uncached input. Tight prefix discipline is the biggest cost lever. | HSBC: 1,200-token regulatory boilerplate invalidated cache → cost spike. | cross-bridge to **#40** (productionised) · enables **#19** (Sherpa cost target) |

---

## Module 4 — Single-Agent Architectures (Sherpa)

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **15** | **Sherpa v1 — Bare ReAct** | 200-line ReAct loop with 4 tools, confidence-threshold termination. The minimum-viable agent. | HSBC: shadow run, 80% accuracy on 5-case eval, $0.054/task. | uses **#1, #4, #8, #11, #13** · → **#16** |
| **16** | **Sherpa v2 — Memory Tiers** | Working (in-context) + episodic (vector) + procedural (heuristic rules) memory. Recurring patterns answered in 1 step. | HSBC: Aisha tired of Sherpa re-investigating Sigma fee-deductions. | extends **#15** · uses **#6** (memory = implicit belief) · → **#17** |
| **17** | **Sherpa v3 — Reflection** | Critic LLM reviews trace; failed cases generate "lessons" stored as procedural memory. Reflexion in production. | HSBC: same `duplicate vs amount_diff` mistake twice = process problem. | extends **#16** · → **#18** · cross-bridge to **#49** (self-improvement) |
| **18** | **Sherpa v4 — Plan-and-Solve Hybrid** | Plan upfront with scoped ReAct sub-loops per step. Best of structure and adaptivity. | HSBC: novel-counterparty static mismatches need ordered investigation. | extends **#17** · → **#19** · cross-bridge to **#26** (sub-loops = mini-orchestrator) |
| **19** | **Sherpa v5 — Production Architecture** | Hybrid agent + eval gate + canary + observability + rollback. The hub everything else connects to. | HSBC: ready for production decision-support; analysts one-click accept/override. | extends **#15-18** · cross-bridges to **#23, #25, #26, #34, #38, #43, #45, #46, #48, #49, #52** |
| **20** | **Eval Gate** | CI step that blocks deploys regressing accuracy/cost/latency on the regression eval set. | HSBC: every prompt change must pass eval gate. | uses **#8** (cost asymmetry) · → **#34** · cross-bridge to **#19** |

---

## Module 5 — Memory & Retrieval (RAG)

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **21** | **Vector Store** | Approximate nearest-neighbour search (HNSW, IVF, PQ) over embeddings. Trade-off: recall × speed × memory. | Helix: 8M PubMed papers, Tom's p95 = 1.8s, needs <500ms. | → **#22** · foundation for **#23, #24** |
| **22** | **Hybrid Retrieval** | Dense (embedding) + sparse (BM25) via Reciprocal Rank Fusion, then cross-encoder rerank top-50. | Helix: agent missed the donepezil paper (literal title match). | uses **#21** · → **#23** |
| **23** | **Agentic RAG** | Agent drives retrieval iteratively — query rewriting, multi-hop, citation verification. | Helix: BRCA2 + PARP resistance + combination — 3-concept query. | uses **#22** · → **#24, #25** · cross-bridge to **#19** (Sherpa upgrades) |
| **24** | **Memory Compaction** | Rolling summarisation when context exceeds threshold; hierarchical layers with drill-down. | Sherpa long traces hit 80K tokens → 30s latency. | uses **#23** · cross-bridge to **#6** (approximates belief) |
| **25** | **Citation Faithfulness** | Every claim verified to have actual support in cited source. Post-hoc audit catches hallucinated citations. | Helix: Maya wouldn't cite an unverified agent answer in a grant. | uses **#23** · cross-bridge to **#45** (feeds audit trail) |

---

## Module 6 — Multi-Agent Systems

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **26** | **Orchestrator-Worker** | One coordinator decomposes; workers execute in parallel; orchestrator synthesises. The production default topology. | HSBC: novel FX swap needs FX + settlement + regulatory specialists. | → **#27, #28, #29** · uses **#18** (planning) · cross-bridge to **#19** |
| **27** | **Specialist Supervisor** | Supervisor agent consults specialists dynamically (vs static fan-out). The more flexible default in real production. | HSBC novel break: supervisor consults regulatory → FX → settlement. | extends **#26** · uses **#15** (each specialist is a mini-agent) |
| **28** | **Handoff Schema (Zod-validated)** | Strict typed contracts between agents. Loose handoffs lose 30% of info per hop. | HSBC FX-expert handoff mis-interpreted → wrong escalation. | uses **#11** · enables **#26, #27** |
| **29** | **Debate / Consensus** | 2+ independent agents propose, critique, vote. Useful when errors are independent. | HSBC: high-stakes breaks need cross-check before commit. | uses **#36** (judge) · cross-bridge to **#19** (high-stakes overlay) |

---

## Module 7 — Tools & MCP

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **30** | **MCP Server** | Model Context Protocol — standard protocol for serving tools/resources/prompts to any agent client. | HSBC compliance team exposes their API once; all agents discover it. | uses **#11** · enables **#31** · cross-bridge to **#19** |
| **31** | **Tool Registry** | Versioned catalogue with discovery (tags/embeddings), per-agent subsetting, deprecation policy. | 70 tools across HSBC + Helix + Acme — central catalogue needed. | uses **#10** (EIG ranks tools) · feeds **#30** |
| **32** | **Sandboxing** | Docker / Firecracker / gVisor / E2B — isolation for code-executing tools. Default-deny network. | Helix CodeAct runs LLM-emitted Python — must be isolated. | → **#33** · enables **#23** (agent-driven retrieval) |
| **33** | **Capability Token** | Scoped, expiring token granting one specific privilege. Enables fine-grained inter-agent delegation. | Acme: supervisor mints "refund order #84291 ≤ $30 for 5 minutes" token. | uses **#12** (constrained decoding enforces) · cross-bridge to **#43** |

---

## Module 8 — Evaluation & Observability

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **34** | **Regression Eval Set** | 200 stratified, frozen historical cases. Blocks deploys that regress >2pp on any slice. | HSBC: locked Q3 eval set, refreshed quarterly. | uses **#20** · → **#37** · cross-bridge to **#19** |
| **35** | **Calibration ECE** | Expected Calibration Error — does "85% confident" actually mean 85% right? | HSBC: Sherpa over-confident on long-tail break shapes. | uses **#9** (KL divergence) · cross-bridge to **#6** (reflects belief quality) |
| **36** | **LLM as Judge** | Pairwise + rubric + bias mitigation (position swap, verbosity penalty, different model). | Helix hypothesis quality — Opus judges Sonnet outputs. | feeds **#29, #34** · uses **#13** (rubric is structured) |
| **37** | **Observability Spans** | OTel-compatible trace per agent invocation; spans for each LLM call, tool call, memory access. | HSBC incident debugging: replay trace from BR-208441. | uses **#34** · → **#41** (feeds runbooks) |

---

## Module 9 — Production Engineering

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **38** | **Durable Execution** | Checkpoint state per step; resume across crashes/deploys. Custom Postgres or Temporal. | HSBC: Node crashes 2:47am mid-batch — 287 tickets lost otherwise. | → **#39** · cross-bridge to **#19** |
| **39** | **Retry + Idempotency** | Exponential backoff on transients, idempotency keys, circuit breakers per tool. | HSBC GL service 0.5% transient rate × 1,400 tasks = 7 false unknowns/night. | uses **#38** · enables **#27** (specialist consultation) |
| **40** | **Cost Optimisation (cache + tiering)** | Prompt cache (10×) + semantic cache (30% hit) + Haiku triage (~40% routed) = 2-4× cost reduction. | Sherpa $52/night → $19/night with all 3 stacked. | extends **#14** (productionised) · → **#41** |
| **41** | **Runbooks + Degradation Modes** | Each alert has documented procedure; auto-switch to degraded/fallback modes under load or outage. | HSBC: accuracy < 88% (7-day) triggers prompt rollback procedure. | uses **#37** · cross-bridge to **#19** |

---

## Module 10 — Safety, Alignment & Security

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **42** | **Prompt Injection** | Direct / indirect (in data) / multi-step. The #1 LLM-specific vulnerability. | HSBC: SWIFT message text contains "IGNORE PREVIOUS INSTRUCTIONS." | → **#43, #44** · cross-bridge to **#25** (citation as defense) |
| **43** | **CaMeL Pattern** | Quarantined agent reads untrusted input (no privileges) + trusted supervisor takes privileged action on validated extraction. | Acme: customer email says "manager approved refund" — quarantined agent extracts intent, supervisor enforces policy. | extends **#42** · uses **#28** (typed handoffs) · cross-bridge to **#19** |
| **44** | **Red-Team Campaigns** | 50+ adversarial test cases per agent, quarterly. Find vulnerabilities before adversaries. | HSBC pre-audit security review: 48/50 blocked, 2 fixed and added to eval. | feeds **#34, #43** |
| **45** | **Audit Trail + Compliance** | Per-invocation log with agent/prompt/model version + evidence chain. 7-year retention. SR 11-7, EU AI Act. | HSBC auditor: "show me all Sherpa classifications last quarter with overrides." | uses **#25, #37** · cross-bridge to **#53** |

---

## Module 11 — Business Cases & Solution Design

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **46** | **ROI Model** | 4 dimensions: cost displaced + cost added + quality delta + risk premium. Sensitivity analysis identifies the deal-breaker. | HSBC: 5-year NPV calc for Sherpa = $20K (sensitive to ≥17% labour displacement). | cross-bridge to **#19** · → **#47** |
| **47** | **Build vs Buy** | TCO + lock-in + differentiation × vendor scorecard. Hybrid (buy framework, build prompts) wins most. | HSBC: BotForce / PredictML / Lumen Agents — pick framework, build prompts. | uses **#46** · → **#48** |
| **48** | **Change Management (4-phase)** | Shadow → Suggestion → Auto-with-veto → Trusted autonomy. Each gate is quantitative, not vibes. | HSBC: Sherpa rolls out shadow → suggest → trusted across 12 months. | uses **#47** · cross-bridge to **#19** (operationalises) |

---

## Module 12 — Advanced Designs

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **49** | **Self-Improvement** | Prompt-level (cheap), DPO (medium), RLAIF (expensive). Mine successful traces for examples; failures for lessons. | HSBC: Sherpa's repeated mistake patterns — automate the lesson promotion from Reflexion. | extends **#17** · → **#50, #51** · cross-bridge to **#19** |
| **50** | **DPO on Agent Rollouts** | Direct preference optimisation on (good-trace, bad-trace) pairs. Lighter than full RLHF; comparable quality. | HSBC: 5,000 trace pairs from Aisha's overrides → trained DPO model. | extends **#49** · alternative to **#51** |
| **51** | **LoRA Adapters** | Low-rank fine-tune for specific domains; compose at inference; no catastrophic forgetting. | HSBC: "novel counterparty" adapter — 78% → 86% on that slice. | extends **#49** · alternative to **#50** |

---

## Module 13 — Future Applications & Frontier

| # | Concept | Brief Details | Business Scenario | Connection / Relationship |
|---|---|---|---|---|
| **52** | **Capability Frontier** | Five directions: context, tool generalisation, multimodality, agent ensembles, on-device. Track quarterly; build for today, architect for tomorrow. | Priya: "what does Sherpa look like in 2030?" | cross-bridge to **#19** (shapes 3-year plan) · → **#53** |
| **53** | **Governance Frameworks** | SR 11-7, EU AI Act, NIST AI RMF, sector-specific. Build to the strictest. | Daniel: external audit + EU AI Act compliance review. | uses **#45** · cross-bridge to **#52** (regulates capability) |

---

# Cross-module spine (top 20 bridges)

These are the bold `===` edges in the [knowledge graph](knowledge-graph.svg) — the "spine of the course":

| From | → | To | Why it matters |
|---|---|---|---|
| #1 Agency Dial | → | #15 Sherpa v1 | Sherpa is deliberately dial 3 |
| #4 ReAct Loop | → | #15 Sherpa v1 | Sherpa is a ReAct implementation |
| #5 POMDP | → | #15 Sherpa v1 | Sherpa is a POMDP solver in practice |
| #6 Belief State | → | #16 Sherpa v2 Memory | Memory tiers approximate belief |
| #8 EVoI | → | #20 Eval Gate | Sherpa's `confidence > 0.83` derives from EVoI |
| #10 EIG per Dollar | → | #31 Tool Registry | Ranks tools by info per dollar |
| #11 Strict Tool Use | → | #15 Sherpa v1, #30 MCP | All agents use it |
| #13 7-Block Prompt | → | #15 Sherpa v1 | Sherpa's system prompt structure |
| #14 Prompt Cache | → | #40 Cost Optimisation | Productionised |
| #19 Sherpa v5 | → | #23, #25, #26, #34, #38, #43 | Hub of the course — all of M5-M10 extends it |
| #25 Citation Faithfulness | → | #45 Audit Trail | Feeds compliance |
| #35 Calibration ECE | → | #6 Belief State | Reflects implicit belief quality |
| #44 Red Team | → | #43 CaMeL | Tests the safety pattern |
| #45 Audit Trail | → | #53 Governance | Required by regulation |
| #46 ROI Model | → | #19 Sherpa v5 | Justifies deployment |
| #48 Change Mgmt | → | #19 Sherpa v5 | Operationalises rollout |
| #49 Self-Improvement | → | #19 Sherpa v5 | Targets the production agent |
| #52 Capability Frontier | → | #19 Sherpa v5 | Shapes 3-year plan |

---

# How to read this together

1. Open **[concept-flow.svg](concept-flow.svg)** — see the numbered boxes laid out by module
2. Scroll the tables above to look up what each number is
3. Open **[knowledge-graph.svg](knowledge-graph.svg)** for the same nodes drawn as a relationship graph (with names instead of numbers)
4. Open **[mindmap.svg](mindmap.svg)** for the hierarchical view organized by theme

The flow shows **structure** (boxes + arrows). The tables give the **content** (what each box is + business context + connections).

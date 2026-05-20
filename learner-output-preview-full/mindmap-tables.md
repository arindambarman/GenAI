# Mindmap Tables — by branch

84 leaf items grouped by the 11 top-level branches in [mindmap.svg](mindmap.svg).

Columns:
- **Topic** — the leaf as it appears in the mindmap
- **Explain** — what it is in 1-2 sentences
- **Business use** — when / why a real team would apply it
- **Important note** — gotcha, caveat, or key insight that distinguishes "I know this" from "I can use this"
- **How connected** — which other mindmap topics it links to (intra-branch or cross-branch)

---

## Branch 1 — M1-3 Foundations

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Agency dial 0-4 | A continuous measure of how much decision-making the LLM owns. 0 = scripted, 2 = workflow with LLM step, 3 = LLM owns loop, 4 = LLM owns goal. | Pick the lowest dial that solves your problem. Use it to compare vendors and architectures objectively. | "Dial creep" is the silent killer — teams start at 2, slip to 4, end up with unpredictable systems. Set deliberately. | Frames the whole course; every Sherpa version (M4) picks a dial; every multi-agent topology (M6) maps to a dial |
| Workflow vs Pipeline vs Agent | Three architecturally distinct shapes (graph / linear / dynamic) of "AI system." Not points on a spectrum. | First question on any AI deployment. Wrong choice = wrong product. | Most "AI agent" projects should be workflows. Cost gradient is 100-1000× between options. | Uses Agency Dial · uses 5-Question Framework |
| Five-question framework | Q1 input enumerable? Q2 sequence pre-knowable? Q3 failure cost bounded? Q4 time budget tight? Q5 ambiguous in natural language? | 30-minute defensible decision per task. Show the answer to procurement. | Common mistake on Q3: people think failure cost = current step cost. It's blast radius. | Feeds every architecture choice; cross-bridge to ROI Model (M11) |
| ReAct loop | Thought → Action → Observation → repeat. Tight loop, no explicit planning. The de-facto baseline. | Most production agents start here. Easy to debug, lowest token cost per step. | Wanders on multi-step tasks (>10 steps). Pair with Plan-and-Solve when sequences have natural structure. | Specializes ReAct/Reflexion/PaS/CodeAct · realized as Sherpa v1 (M4) |
| Reflexion | ReAct + a critic that reviews the trace and stores verbal "lessons" for next attempt. | High-accuracy tasks with checkable answers (code, math, classification with feedback). | N× token cost (one full trial per retry). Worth it only when accuracy outweighs cost. | Extends ReAct loop · realized as Sherpa v3 (M4) · cross-bridge to Self-Improvement (M12) |
| Plan-and-Solve | Generate a plan upfront, execute step-by-step, re-plan on failure. | Multi-step tasks with natural sub-structure and tight time budgets. | Brittle when the plan turns out wrong. Re-planning is expensive; cap to 2 attempts. | Realized as Sherpa v4 (M4); subloops use ReAct |
| CodeAct | Actions are executable Python instead of typed tool calls. Compositional. | Data-heavy tasks (filtering, joining, aggregating tool outputs). Replaces 10 ReAct steps with 1 code block. | Requires hardened sandbox; without one, you've built a remote code execution vector. Trace is harder to audit. | Cross-bridge to Sandboxing (M7) |
| MDP | Markov Decision Process tuple ⟨S, A, T, R, γ⟩ — formal frame for sequential decisions under full observability. | Vocabulary for reasoning about agent decisions (states, actions, rewards, value). | LLM agents don't compute MDPs — but the formalism tells you when behaviour is rational. | Extended by POMDP |
| POMDP | MDP + observation model. The right formalism for LLM agents (state is hidden). | Provides the math behind agent termination rules and the "implicit belief" framing. | The agent's "belief" is opaque (the context window), but Markov property still holds trivially. | Specializes MDP · cross-bridge to Sherpa v1 (M4) which is a POMDP solver in practice |
| Belief state | Probability distribution over hidden states. Updated via Bayes after each observation. | Mental model for "what the agent thinks is going on." | LLM agents don't compute distributions; they hold the trace as an implicit, opaque belief. Measured via Calibration ECE (M8). | Cross-bridge to Memory Compaction (M5) — memory tiers approximate the belief |
| EVoI | Expected Value of Information for one more action. Stop when no action's EVoI > 0. | Principled termination rule. Tunable from cost asymmetry of right vs wrong answers. | Sherpa's `confidence > 0.83` is the result of EVoI math, not intuition (200/(42+200) ≈ 0.826). | Cross-bridge to Eval Gate (M4) and Sherpa v1 |
| Bayes rule | P(H\|E) ∝ P(E\|H) · P(H). | The math behind every belief update. LLM agents encode it implicitly via priors in prompts. | "Implicit Bayes" via prompt = production pattern. Most teams don't compute posteriors; they put base rates in the system prompt. | Underpins Prior encoding · cross-bridge to 7-block Prompt |
| Prior encoding | Embed Bayesian priors (base rates) directly in the system prompt and tool descriptions. | Production pattern that makes the LLM behave Bayesianly without computing anything. | Stale priors are *worse* than no priors — refresh quarterly from production data. | Uses Bayes Rule · feeds Calibration (M8) |
| Entropy | H(X) = -Σ P(x) log P(x). Quantifies uncertainty in bits. | Foundation of every information-theoretic agent metric. | Maximum at uniform (you know nothing); zero at point mass (you know exactly). | Underpins Mutual Information and EIG per dollar |
| Mutual information | I(X;Y) = H(X) − H(X\|Y). How much an observation Y reduces uncertainty about X. | Justifies tool selection — pick the tool that distinguishes hypotheses, not the one that confirms the leading one. | Information-greedy prompting approximates this without computing it. | Uses Entropy · feeds EIG per Dollar |
| EIG per dollar | Expected Information Gain ÷ tool cost. Principled tool ranking. | Justifies "which tool first" decisions objectively. Beats "cheapest" and "model picks" heuristics. | If your agent does N tool calls with declining marginal information, you're missing a termination heuristic. | Uses Mutual Information · cross-bridge to Tool Registry (M7) — ranks tools |
| Attention mechanism | QKV softmax over the context. Defines what the model can "see." | Explains why prompts have to be designed with attention in mind — beginning and end matter most. | Adding tokens dilutes attention. More context isn't always better; effective context is ~60% of nominal. | Underpins Prompt Cache, Memory Compaction (M5), 7-block Prompt |
| Strict tool use | Constrained decoding at sampling time forces tool names and argument types to be valid. | Eliminates hallucinated tool names — the #1 cause of agent drift in production. | Choose this over prompted function calling; the cost of strict mode is tiny, the reliability gain is large. | Used by every agent in Sherpa (M4) and MCP (M7) |
| Constrained decoding | FSM over the JSON schema restricts legal next tokens to keep output valid. | Zero malformed JSON in production. Catches schema violations at generation time, not parse time. | Doesn't catch *semantic* errors (model picks wrong-but-valid option). Pair with eval. | Underpins Strict Tool Use, Capability Tokens (M7) |
| 7-block prompt | Role / Mission / Priorities / Tools / Constraints / Examples / Output — survives model upgrades. | Canonical agent prompt structure. Use this for every new agent. | Order matters. Constraints belong at end (recency bias). Examples in the middle. | Used by every agent in M4-M6 |
| Prompt cache | Provider caches the stable prefix; 10× cheaper than uncached input tokens. | Single biggest cost-reduction lever. Preserve prefix stability above all else. | Any prefix change invalidates the cache. The 1,200-token "improvement" cost 4× more for 6 hours after deploy. | Operationalised in Caching Tiers (M9) |

---

## Branch 2 — M4 Single-Agent Sherpa

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Sherpa v1 ReAct | 200-line minimum-viable ReAct loop with 4 tools + confidence termination. | Starting point for any agent. Build this first, measure, then add. | Don't add cleverness before measuring v1. Most "we need multi-agent" claims fail to even pilot v1. | Uses ReAct loop, POMDP, Strict tool use, 7-block prompt · → v2 |
| Sherpa v2 Memory tiers | v1 + working / episodic / procedural memory. Recurring patterns answered in 1 step. | Cuts cost ~5× on recurring tasks. Episodic memory uses vector retrieval. | Memory pollution: only store cases the human verified correct. Decay by recency. | Uses Belief State (M2) — memory approximates implicit belief |
| Sherpa v3 Reflection | v2 + critic LLM reviews trace; failures → procedural "lessons." | Catches systematic errors that one-shot inference misses. | Max 1 retry in production. Cost grows fast; critic quality bounds the gain. | Cross-bridge to Self-Improvement (M12) |
| Sherpa v4 Plan-and-Solve | v3 + upfront plan; scoped ReAct subloops per step. | Best for multi-step tasks with sub-structure. Worse on short tasks (planning overhead). | Subloops are key: scope the tools per step, narrow the choice space, reduce variance. | Cross-bridge to Orchestrator-Worker (M6) — same shape |
| Sherpa v5 Production | v4 + eval gate + canary + observability + safety + rollback. The hub of the course. | What production deployments actually look like. | Production discipline (eval, observability, audit) is load-bearing — under-investing here is why most agents fail in prod. | Hub — extends from M1-M3, extended by M5-M13 |
| Eval gate | CI step that blocks deploys regressing accuracy/cost/latency on a frozen regression set. | Non-negotiable for any agent shipping changes. | Stratify by slice (counterparty, time, category). Aggregate accuracy hides real regressions. | Uses Regression Eval (M8) |
| Canary deploy | Send 5% of traffic to the new version for N nights, compare to control. | Catches production-specific issues regression eval can't (distribution shift, novel patterns). | Power analysis: 5% × 3 nights ≈ 200 cases — only detects 3pp+ accuracy differences. Plan more nights if you're unsure. | Uses Eval Gate, Observability Spans (M8) |

---

## Branch 3 — M5 Memory and RAG

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Vector stores HNSW IVF | Approximate nearest-neighbour data structures for embedding search. | Backbone of semantic search at scale (>100K docs). | At small scale (<100K), brute-force on numpy beats any vector DB. The complexity only pays off above scale. | Foundation for Hybrid Retrieval, Agentic RAG |
| Dense embeddings | Vector representations from models like text-embedding-3-large, BGE, e5. | Semantic similarity search; clustering; deduplication. | Embedding model choice can swing recall@10 by 10pp on your domain — test, don't assume. | Used by Vector Stores |
| Hybrid retrieval | Dense (embedding) + sparse (BM25) merged via Reciprocal Rank Fusion. | Catches both semantic and exact-token signals. ~15pp recall improvement over dense-only. | RRF is parameter-free and beats convex combinations because rank scales better than score. | Combines Dense Embeddings + sparse BM25 |
| Reranking | Cross-encoder rescores top-50; 5-15pp accuracy at 100× the per-doc cost. | Last-mile precision boost when hybrid retrieval gets you to 80-90%. | Skip if hybrid already hits 95%+ recall. Wasted cost otherwise. | Layers on top of Hybrid Retrieval |
| Agentic RAG | Agent drives retrieval iteratively — query rewriting, multi-hop, verification. | Complex queries needing decomposition (BRCA2 + PARP-inhibitor resistance + combinations). | Cap hops at 3-5. Error compounds; cost runs away. Always verify citations. | Cross-bridge to Sherpa v5 (M4) |
| Multi-hop | Result of one retrieval becomes the query for the next. | Necessary for chained reasoning over a corpus. | Each hop has independent recall (~70%); 3 hops gives 0.7³ = 34% end-to-end without verification. | Used by Agentic RAG |
| Memory compaction | Rolling summarisation when context exceeds threshold + hierarchical layers. | Long-trace agents (10+ steps) without exploding latency. | Compaction loses information; never summarise tool-output schemas — keep verbatim. | Cross-bridge to Belief State (M2) — approximates implicit belief |
| Citation faithfulness | Every claim verified to actually be supported by the cited source. | Mandatory for research, regulated industries, anywhere hallucination is existential. | Use a second LLM (or deterministic check) to audit citations post-generation. | Cross-bridge to Audit Trail (M10) — feeds compliance evidence |

---

## Branch 4 — M6 Multi-Agent

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Orchestrator-worker | One coordinator decomposes; N workers run in parallel; orchestrator synthesises. | Production-default topology. Independent sub-tasks. | Coordination cost grows. Past ~5 workers, coordination overhead > work done. | → Specialist Supervisor, Handoff Schemas, Debate |
| Hierarchical | Tree of orchestrators. Top decomposes coarsely; sub-orchestrators decompose finely. | Tasks with multi-level structure (large research projects). | Depth multiplies latency; errors compound across levels. Cap depth at 2 in production. | Extends Orchestrator-Worker |
| Specialist supervisor | Supervisor consults specialists dynamically (vs static fan-out). | More flexible than pure orchestrator-worker when set of needed specialists is dynamic. | Use when you don't know upfront which specialists are needed. Save cost by skipping irrelevant ones. | Extends Orchestrator-Worker |
| Handoff schemas | Strict Zod-validated contracts between agents. | Eliminates the #1 multi-agent failure: misinterpretation at handoff. | Unstructured handoffs lose ~30% of usable information per hop. Structured loses ~5%. | Uses Strict Tool Use (M3) |
| Debate consensus | 2+ independent agents propose, critique, vote. | High-stakes, low-volume tasks where accuracy is worth the cost. | "Echo chamber" risk: same model + similar prompts = correlated errors = false confidence. Different models needed. | Uses LLM as Judge (M8) |
| Anti-patterns | Premature multi-agent · coordination dominance · echo chamber · handoff loss · recursive over-engineering. | Pre-design checklist to avoid expensive mistakes. | Always build single-agent baseline first. Only add a second agent if specific failure modes warrant it. | Inverse of every multi-agent pattern |

---

## Branch 5 — M7 Tools and MCP

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Tool registry | Versioned catalogue with discovery, per-agent subsetting, deprecation policy. | Mandatory once you have >20 tools across multiple agents. | Tool-selection accuracy drops as O(log N) with choice size. Per-agent subsetting is the biggest fix. | Cross-bridge to EIG per Dollar (M2) — ranks tools |
| MCP servers | Model Context Protocol — standard protocol for serving tools to any agent client. | Eliminates per-integration glue code. Cross-team / cross-vendor tool reuse. | Wrap third-party APIs as MCP servers *in your control* even if vendor doesn't natively support — standard agent view + swap-ability. | Standardises Tool Registry usage |
| Sandboxing Docker Firecracker | Isolation for code-executing tools. Default-deny network. | Mandatory for CodeAct or anything running LLM-emitted code. | Default Docker doesn't block network — must explicitly disable. gVisor/Firecracker for true isolation. | Cross-bridge to CodeAct (M1) |
| Capability tokens | Scoped, expiring tokens granting one specific privilege. | Fine-grained delegation in multi-agent systems. Supervisor mints "refund up to $30 for order X for 5 min." | Tokens beat role-based ACLs for dynamic permissions. Composable across multi-agent flows. | Cross-bridge to CaMeL (M10) — privilege separation |
| ACL audit | Every tool call logged with agent identity, tool, args, decision, outcome. | Audit and compliance for regulated deployments. | 7-year retention typical. Append-only + cryptographic chaining for tamper evidence. | Feeds Audit Trail (M10) |

---

## Branch 6 — M8 Evaluation

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Regression eval set | 200 stratified, frozen historical cases. Blocks deploys regressing >2pp. | Mandatory CI step for any agent shipping changes. | Refresh 20% / quarter. Without rotation, you overfit to the set and numbers drift up without real improvement. | Used by Eval Gate (M4), CI Gates |
| Stratified accuracy | Report accuracy per slice (category, counterparty tier, time of day). | Catches hidden regressions aggregate metrics miss. | Aggregate "−0.5pp" can hide a "−5pp on slice X" that's actually a critical regression. Stratify always. | Refines Regression Eval |
| LLM as judge | Pairwise + rubric + bias mitigation (position swap, different model). | Open-ended tasks without programmatic ground truth (hypothesis quality, creative writing). | Position bias is real (judge prefers option A). Always run both orders, average. | Feeds Debate (M6) and Regression Eval |
| Calibration ECE | Expected Calibration Error — does "85% confident" mean 85% right? | Primary eval metric for agents with elicited confidence. Drives debugging when miscalibrated. | LLM agents are usually over-confident on rare classes. Track per-bin, not just aggregate. | Cross-bridge to Belief State (M2) — reflects implicit belief quality |
| Observability spans | OTel traces per agent invocation with spans for LLM calls, tool calls, memory reads. | Required for debuggable production agents. Without traces, every incident is guesswork. | Sample failures always; sample 1% of successes. Storage cost manageable. | Feeds Runbooks (M9) |
| CI gates | Eval runs in CI on every PR. Posts diff comment. Fails build on regression. | Same discipline as unit tests. Without this, "we'll re-eval before deploy" never happens. | Use seeded sampling for determinism + caching by (model, prompt, input) hash. Cuts CI from hours to minutes. | Composes Regression Eval + Eval Gate |

---

## Branch 7 — M9 Production

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Durable execution | Checkpoint state per step; resume across crashes / deploys / timeouts. | Mandatory for batch workloads. Without it, crashes lose all in-flight work. | Custom Postgres works for one workflow type. Switch to Temporal at 5+ workflow types or when you need scheduled resumes. | → Retry & Idempotency · cross-bridge to Sherpa v5 (M4) |
| Retry idempotency | Exponential backoff for transient errors + idempotency keys on writes. | Tool failures are routine; without retry the agent sees 0.5%-1% spurious failures. | Surface failures to the agent; don't hide. Hidden failures cause silently wrong outputs. | Uses Durable Execution |
| Circuit breaker | If tool fails N times in M sec, refuse calls for K sec. | Prevents agent from hammering a failing dependency and cascading the outage. | Pair with surfaced failures: agent knows the tool is unavailable, can pick a different one. | Layers with Retry |
| Cost attribution | Per-task cost breakdown by component (input, output, tools, memory). | Required to optimise cost rationally. Without it you optimise the wrong thing. | Output tokens dominate (~66% of Sherpa cost). Cache hit rate is second-order. | Used by Caching Tiers |
| Caching tiers | Prompt cache (10×) + semantic cache (~30% hit) + Haiku triage (~40% routing). Stack all 3 for 2-4× total. | Cost reduction without quality loss. Sherpa: $52/night → $19/night with all three. | Semantic cache needs verification (one cheap tool call before accepting cached answer) to prevent false hits. | Operationalises Prompt Cache (M3) |
| Runbooks | Each alert has a documented procedure: investigate → diagnose → mitigate → fix. | Mean-time-to-resolve goes from hours to minutes. | Practice rollback monthly so it's muscle memory when needed. | Feeds Capacity Planning |
| Capacity planning | Project tokens × calls per minute vs provider rate limit. Plan for 2× peak. | Avoids being rate-limited at peak times (Black Friday, batch windows). | Pre-arrange tier upgrades for known seasonality. Provision OpenAI as overflow for Anthropic. | Uses Cost Attribution |

---

## Branch 8 — M10 Safety and Audit

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Prompt injection | Malicious instructions in the agent's input (direct, indirect, or multi-step). The #1 LLM-specific vulnerability. | Defending production agents that process user content. | No single defence is sufficient; layer 4-5. Multi-step injection is the hardest variant (planted instruction triggers later). | → CaMeL, Red Team Campaigns |
| CaMeL | Privilege separation: quarantined agent reads untrusted input (no tools) + trusted supervisor takes action on validated extraction. | Any agent acting on untrusted input. Banking, customer support, claims processing. | The supervisor literally cannot see the email body. Injection can only affect the extracted structured data. | Extends Prompt Injection · uses Handoff Schemas (M6) |
| Red team campaigns | Quarterly adversarial test cases per agent. Find vulnerabilities before adversaries. | Pre-audit security reviews; ongoing security posture maintenance. | Each success → eval case + defence patch. Track time-to-detect; even successful attacks lose value when caught fast. | Tests CaMeL, feeds Regression Eval (M8) |
| Audit trail | Per-invocation log: agent/prompt/model versions + evidence chain. 7-year retention. | Required by SR 11-7, EU AI Act, GDPR. | Append-only + cryptographic chaining for tamper evidence. PII handling required per applicable regulation. | Uses Citation Faithfulness (M5), Observability Spans (M8) |
| SR 11-7 | US banking model risk management. Five pillars: conceptual soundness, performance monitoring, process verification, outcomes analysis, independent review. | Banking deployments. Required for any model-driven decision. | Most of this is satisfied by Module 8-10 discipline. New: annual independent review by separate team. | Required by US banking deployments |
| EU AI Act | EU regulation for high-risk AI systems. Risk-based tiering with technical documentation, human oversight, transparency requirements. | EU deployments or any system processing EU residents' data. | "Intended purpose" documentation is the new requirement most teams forget. Document deliberately. | Required by EU deployments |

---

## Branch 9 — M11 Business

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| ROI modeling | 4-dimensional model: cost displaced + cost added + quality delta + risk premium → NPV with sensitivity analysis. | Defending the project to leadership. Quarterly refresh against actuals. | Sensitivity analysis matters more than the point NPV — identify the deal-breaker variable. | Cross-bridge to Sherpa v5 (M4) — justifies the deployment |
| Build vs Buy | TCO + lock-in + differentiation × vendor scorecard. Hybrid (buy framework, build prompts) wins most cases. | First architecture decision after "should we build this?" | Vendor lock-in calculation: 5-year switch cost vs annual savings difference. Build abstraction layer (~10% cost) for flexibility. | Uses ROI Model · → Change Management |
| Case templates | Banking-regulated · Research-knowledge · Consumer-scale. Each maps to a Sherpa-shaped pattern. | Adapt to your domain by matching template, not from scratch. | What transfers: discipline, mental models, infrastructure. What doesn't: specific tools, prompts, business rules. | Reuses Sherpa v5 architecture as template |
| Change management | 4-phase rollout: Shadow → Suggestion → Auto-with-veto → Trusted autonomy. Each gate is quantitative. | Building user trust without breaking SLAs. | Going too fast destroys trust; too slow loses ROI. Phase advancement requires hard metrics, not vibes. | Operationalises Sherpa v5 deployment |
| Stakeholder mapping | List 5-10 stakeholders, their concerns, and what counts as a "win" for each. | Avoids deployment stalls. Lose any stakeholder and the project dies. | Common omission: security & compliance. Get them in early or face a launch-blocking review. | Feeds Change Management |
| Success scorecard | 6-month post-launch metrics across business / technical / organisational dimensions. | Justifies the next agent deployment. Documents what actually happened vs projected. | Project mortality is high if you can't show results. Score conservatively to maintain credibility. | Aggregates ROI Model + Eval Metrics |

---

## Branch 10 — M12 Advanced

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Prompt-level improvement | Mine successful traces for examples; failed traces for cautionary lessons; refresh prompt quarterly. | Production-feasible today. Low risk, modest gain. | Always A/B-test before promoting. Run on regression eval to ensure no slice regresses. | Extends Reflection (M4 Sherpa v3) |
| DPO on rollouts | Direct Preference Optimization on (good-trace, bad-trace) pairs from production. | Mid-volume agents where prompt tuning has saturated. | Lighter than full RLHF (~$15K vs $200K). Comparable quality on most benchmarks. | Alternative to LoRA Adapters |
| LoRA adapters | Low-rank fine-tunes per domain; compose at inference; no catastrophic forgetting. | Specialise on narrow domains (novel-counterparty, regulated jurisdiction) without retraining base. | Cheapest weights-level improvement option (~$1-5K per adapter). Most practical for most teams. | Alternative to DPO on Rollouts |
| Continual learning | Daily/weekly updates without forgetting prior behaviour. | High-volume agents with drifting distributions (Helix's daily new papers). | Most production agents don't need this — episodic quarterly retraining suffices. Don't over-engineer. | Extends LoRA Adapters |
| World models | Learned simulators that predict (next state, reward) given (state, action). | Planning by imagined rollouts before committing — promising for scientific discovery. | LLMs are bad world models for physical/quantitative domains (30-50% accuracy). Use real simulators where available. | Foundation for Embodied Agents |
| Embodied agents | Vision + language + action. Today: GUI agents (Anthropic computer use, OpenAI Operator). Tomorrow: robotics. | GUI automation today; broader business workflows in 2-3 years. | Sim-to-real gap remains 20-50%. Belt-and-suspenders fallback strategies essential. | Uses World Models |

---

## Branch 11 — M13 Frontier

| Topic | Explain | Business use | Important note | How connected |
|---|---|---|---|---|
| Capability directions | Five frontiers: longer context, better tool generalisation, multimodality, agent ensembles, on-device. | Quarterly architecture review — which to adopt when. | Don't bet the business on capabilities 5+ years out. Plan for what's likely in 12-36 months. | Shapes 3-year planning for Sherpa v5 (M4) |
| Application timeline | Per-domain estimates for production-readiness: coding (today), research synthesis (2026), personal agents (2027+), regulated decisions (2028+). | Roadmap planning for new agent deployments. | High uncertainty. Update annually. "Wedge first, expand later" — narrowest, highest-value slice. | Refines Capability Directions |
| Agent economies | Agents negotiating with agents (procurement, support, escrow). | 2-5 years out for non-trivial use cases; worth tracking. | Risk: opposing agent finds exploit your agent agrees to. Hard limits in code, not prompt. | Cross-bridge to Capability Tokens (M7) |
| Concentration risk | When 3 providers run 90% of agents — coordinated outage, pricing, capability shifts, alignment. | Architecture-level decisions: multi-provider routing, local fallbacks. | Industry-collective bargaining and regulatory caps are policy-level mitigations. | Influences Build vs Buy (M11) |
| Governance frameworks | SR 11-7, EU AI Act, NIST AI RMF, sector-specific (medical, legal, HR, education). | Compliance for regulated deployments. Build to the strictest applicable. | Compliance is a moving target. Quarterly review of applicable frameworks. Annual dry-run audit. | Uses Audit Trail (M10) |
| Professional ethics | Honesty about capability + limitations; reversibility-first design; affordance for override; accountability. | Industry norms emerging beyond regulation. | The "boring discipline layer" (eval, observability, audit) is the differentiator that earns long-term trust. | Wraps every other concept in the course |

---

# How to use this with the other documents

- **[mindmap.svg](mindmap.svg)** — visual hierarchy; spot a branch quickly
- **[mindmap-tables.md](mindmap-tables.md)** *(this file)* — what each leaf actually means + business context
- **[concepts-by-name.md](concepts-by-name.md)** — same content from the knowledge-graph perspective (relationship-focused)
- **[knowledge-graph.svg](knowledge-graph.svg)** — visual web of relationships
- **[concept-flow.svg](concept-flow.svg)** — numbered boxes if you prefer numeric reference
- **[concept-tables.md](concept-tables.md)** — numbered version of the per-module tables

The mindmap is for *seeing structure*; this table is for *understanding what's in each branch*.

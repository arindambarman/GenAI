# Module 6 — Multi-Agent Systems

> **Module length:** ~10 hours · **Lessons:** 4 · **Prereqs:** Module 4 (single-agent Sherpa), Module 5 (shared memory).

## Learning objectives

1. **Design** orchestrator-worker, hierarchical, and peer-to-peer multi-agent topologies.
2. **Implement** debate and consensus patterns where they add value.
3. **Manage** inter-agent communication via structured contracts.
4. **Avoid** the multi-agent anti-patterns that turn a system into a debugging nightmare.

## Module mind map

![Module mind map](diagrams/m06/01-module-mindmap.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Multi-Agent))
    Topologies
      Orchestrator-worker
      Hierarchical
      Peer-to-peer
      Swarm
    Coordination
      Handoffs
      Shared state
      Message bus
    Quality
      Debate
      Voting
      Critic
    Anti-patterns
      Echo chambers
      Coordination overhead
      Handoff loss
```

</details>

## Module DAG

![Module DAG](diagrams/m06/02-module-dag.svg)

<details><summary>Mermaid source</summary>

```mermaid
graph LR
  L61[6.1 Topologies]:::current --> L62[6.2 Coordination]
  L62 --> L63[6.3 Debate & Consensus]
  L62 --> L64[6.4 Anti-patterns]
  L61 -.uses.-> M4[Module 4: agents as building blocks]
  L62 -.forward.-> M7[Module 7: MCP for cross-agent tools]
  classDef current fill:#fc6,stroke:#a60,stroke-width:3px
```

</details>

---

# Lesson 6.1 — Topologies: Orchestrator-Worker, Hierarchical, Peer

> **§0 · From last time.** Sherpa is one agent. For HSBC's *complex* breaks (1% of volume, 10% of revenue impact), one agent isn't enough — we need specialists and a coordinator.

## §1 · Business scenario

*HSBC, novel break.* A multi-counterparty FX swap with a settlement chain across three time zones. Sherpa wanders, hits its 8-step cap, returns "unknown."

> *"This needs three specialists: an FX expert, a settlement-chain analyst, a regulatory check. Plus someone to coordinate. Can we build that as agents?"*

## §2 · Bridge

Multi-agent systems shine when sub-tasks are *specialised* and *parallelisable*. Wrong shape and you get worse performance than single-agent. The topology choice determines which.

## §3 · Mind map

![Mind map](diagrams/m06/03-topologies.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Topologies))
    Orchestrator-Worker
      One coordinator
      Many workers
      Fan-out fan-in
    Hierarchical
      Tree of agents
      Sub-coordinators
      Recursive
    Peer-to-peer
      No central
      Direct comms
      Hard to debug
    Swarm
      Many small
      Emergent behavior
      Game-AI style
```

</details>

## §4 · Elaboration

### 4.1 Orchestrator-worker (the production default)

One "orchestrator" agent reads the task, decomposes it, dispatches to N "worker" agents in parallel, aggregates results. Workers don't talk to each other.

Pros: simple, debuggable, scales well, matches Plan-and-Solve naturally.
Cons: orchestrator is a single point of failure; bottleneck on synthesis.

### 4.2 Hierarchical

A tree of orchestrators. Top-level decomposes coarsely; sub-orchestrators decompose finely; leaves do work. Useful for tasks with natural multi-level structure (large research projects, multi-team workflows).

Pros: handles scale; specialisation per level.
Cons: depth multiplies latency; errors compound.

### 4.3 Peer-to-peer

Agents communicate directly with each other. No central coordinator.

Pros: no single point of failure; emergent capabilities.
Cons: nearly impossible to debug; coordination cost can dominate.

Use only when the task genuinely requires symmetric interaction (e.g., negotiation, debate). For most production tasks, orchestrator-worker is the right shape.

### 4.4 Swarm

Many small, simple agents with local rules; complex global behaviour emerges. Used in game AI, robotics. Rare in business agents because behaviour is hard to specify.

### 4.5 Choosing topology

```
if sub-tasks are independent and parallelisable:
  orchestrator-worker
elif sub-tasks have multi-level decomposition:
  hierarchical
elif sub-tasks require symmetric interaction:
  peer-to-peer or debate
else:
  single agent
```

## §5 · Problem

Design a multi-agent system for HSBC's novel FX-swap breaks:
1. Identify specialists needed.
2. Choose topology.
3. Sketch the orchestration logic.

## §6 · Solution

Orchestrator-worker:
- **Orchestrator**: decomposes the break into 3 sub-investigations.
- **FX expert worker**: validates FX leg pricing against market data.
- **Settlement-chain worker**: traces the cross-time-zone settlement path.
- **Regulatory worker**: checks against applicable jurisdiction rules.
- Orchestrator aggregates: if any worker flags an issue, the break is escalated to human.

Cost: ~5× single-agent cost (orchestrator + 3 workers + synthesis). Worth it because novel breaks have outsized revenue impact and humans currently take 45 minutes each.

## §7 · Math

### 7.1 Coordination overhead

For N agents:
- Orchestrator-worker: O(N) messages
- Hierarchical (balanced tree): O(N) messages
- Peer-to-peer: O(N²) messages

Peer-to-peer's quadratic cost kills it past ~5 agents.

### 7.2 Speedup vs N

For independent sub-tasks: linear speedup until network/orchestrator bottleneck.
For coupled sub-tasks: speedup capped by critical path (Amdahl).

## §8 · Tech deep-dive

### 8.1 The orchestrator's prompt

Should be deliberately *narrow*: only the decomposition logic. Don't put domain knowledge in the orchestrator; that belongs in workers. Orchestrator drift is a top failure mode if the orchestrator starts "helping" with worker tasks.

### 8.2 Worker specialisation

Each worker gets:
- A focused system prompt (its specialty)
- A *subset* of tools (only what it needs)
- A bounded budget (max steps per worker)

Scope-restriction makes each worker reliable. Wide-scope workers behave like a worse single agent.

### 8.3 The synthesis step

After workers report, the orchestrator synthesises. This step is high-leverage and often gets undersized. Give it explicit instructions on conflict resolution: "if two workers disagree, prefer the one with higher confidence; if both high confidence, escalate."

### 8.4 Specific signals to switch from single-agent to orchestrator-worker

Don't multi-agent on instinct. Use these objective triggers:

| Signal | Threshold | Reason multi-agent helps |
|---|---|---|
| Single-agent step-cap hits | > 15% of tasks | Agent is wandering; sub-task decomposition would scope-restrict |
| Tool-set size for one agent | > 25 tools | Wrong-tool selection rate climbs; per-worker tool subsets cut it |
| Context length exceeds | 60% of model max | Specialisation lets each worker see only relevant context |
| Per-task latency budget | < average task latency | Parallelism via independent workers compresses critical path |
| Expert-rule sets that don't compose well | 3+ distinct rule books | Each becomes a specialist worker; orchestrator routes |

If you don't have at least two of these signals: stay single-agent. The complexity cost (Lesson 6.4) outweighs the benefit.

### 8.5 The "specialist supervisor" pattern (more common than pure delegation)

Most production "multi-agent" systems aren't true orchestrator-worker. They're a *supervisor with specialist consultants*:

```typescript
// Specialist supervisor pattern
async function classifyComplexBreak(breakId: string): Promise<Classification> {
  const supervisor = new ReActAgent(SUPERVISOR_PROMPT, supervisorTools);
  // Supervisor is a normal ReAct agent. Its tools include consulting specialists.

  return supervisor.run({
    breakId,
    consultants: {
      fxExpert: createSpecialist("fx", fxTools, FX_PROMPT),
      settlementExpert: createSpecialist("settlement", setTools, SET_PROMPT),
      regulatoryExpert: createSpecialist("reg", regTools, REG_PROMPT),
    },
  });
}
```

Differences from pure orchestrator-worker:
- Supervisor decides *whether* to consult, *which* specialist, and *when to stop consulting* — dynamically.
- Specialists are *invoked* (like tools), not *dispatched* (like jobs).
- Supervisor maintains the conversation; specialists are stateless per consultation.

When to prefer this over pure orchestrator-worker:
- The set of needed specialists is dynamic (you don't know upfront which to call).
- Specialists' answers may *prompt new questions* the supervisor needs to ask.
- The synthesis is iterative, not one-shot.

When pure orchestrator-worker is better:
- All specialists need to run regardless (parallelism wins).
- Sub-tasks are heavyweight (you want fan-out, not pull).

### 8.6 Operational considerations the topology question hides

| Concern | Single-agent | Orchestrator-worker | Specialist supervisor | Hierarchical |
|---|---|---|---|---|
| End-to-end latency | LLM-call serial | Critical path = slowest worker | Sum of consultations | Sum across depth |
| Debugging | One trace | One trace per sub-job + orchestrator trace | One trace with nested consultations | Tree of traces |
| Observability cost | 1× | 1× orchestrator + N× workers | 1× supervisor + M× specialists | Exponential in depth |
| Cost per task | $c$ | $1.2c$ to $3c$ | $1.5c$ to $4c$ | $5c$ to $20c$ |
| Failure modes | Loop, wrong-tool, hallucination | + bad decomposition, lost handoff, partial failure | + spurious consultation, supervisor drift | + cascading failure across levels |

The "right" topology depends on which failure modes you're willing to accept, not just on capability.

### 8.7 Worked example: HSBC's novel FX swap, end-to-end

A real-shape example (numbers illustrative). The break: cross-currency basis swap, USD/JPY/EUR three-way, settles across Tokyo/London/New York, ~$45M notional, broke at the JPY leg by ~$1.2M after counterparty refused settlement.

**Topology chosen:** specialist supervisor (more flexible than pure orchestrator-worker for this case).

**Supervisor's trace (compressed):**
```
Thought: Three-currency basis swap. The FX, settlement, and regulatory dimensions
         all need investigation. Start with regulatory — if a jurisdiction is
         the blocker, FX/settlement analysis is moot.
Action: consult(regulatoryExpert, "Are there jurisdictional issues with this
                  counterparty + currency mix as of trade date?")
Observation: { conclusion: "no_issue", confidence: 0.9, evidence: [...] }
Thought: Regulatory clean. Now FX leg pricing.
Action: consult(fxExpert, "Was the JPY leg priced consistently with market on
                  trade date?")
Observation: { conclusion: "issue", confidence: 0.85,
              detail: "JPY priced at 158.4 vs market 158.7, ~$340k discrepancy" }
Thought: FX off by ~$340k. But break is ~$1.2M. Need settlement chain check.
Action: consult(settlementExpert, "Trace the JPY leg settlement chain.
                  Was any leg failed or reversed?")
Observation: { conclusion: "issue", confidence: 0.9,
              detail: "Tokyo leg failed at 09:14 JST; auto-reversed at 09:42;
              counterparty refused re-submission" }
Thought: Two issues identified — FX mispricing (~$340k) and settlement failure
         (~$860k from refusal). Sum matches break. High confidence on cause.
Action: synthesise(...)
Answer: { classification: "settlement_failure_with_pricing_error",
          confidence: 0.88, recommended_action: "escalate_to_FX_desk_and_ops",
          evidence_chain: [3 consultant reports] }
```

**Cost:** 1 supervisor call + 3 specialist calls × ~5 LLM-calls each + 1 synthesis = ~17 LLM calls, ~$0.18.

**Compared to:**
- Single-agent (Sherpa v5) on same break: cap hit at 8 calls, returned "unknown", $0.06 wasted.
- Pure orchestrator-worker (decompose upfront into 3 fixed jobs): would have run all three even when regulatory came back clean, $0.24.

The supervisor pattern saved $0.06 vs orchestrator-worker by *not consulting regulatory in depth* once the first response was clean, while still solving what single-agent couldn't. **The pattern matters more than the dial setting.**

## §9 · Unlocks

- 6.2 covers the inter-agent communication contracts.
- 6.3 covers when to add debate/voting.
- 6.4 catalogues the anti-patterns.

---

# Lesson 6.2 — Coordination: Handoffs, Shared State, Message Contracts

> **§0 · From last time.** Topology determines who talks to whom; coordination is *how* they talk.

## §1 · Business scenario

The FX-expert worker passes a result to the orchestrator. Orchestrator interprets it differently than the worker intended. Decision: wrong escalation.

> *"They were speaking different languages. We need contracts."*

## §2 · Bridge

Inter-agent messages need explicit schemas — same discipline as tool calls. Loose handoffs lose information; structured handoffs preserve it.

## §3 · Mind map

![Mind map](diagrams/m06/04-coordination.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Coordination))
    Handoff schema
      Typed result
      Confidence
      Caveats
      Provenance
    Shared state
      Read-only context
      Versioned
      Append-only
    Message bus
      Pub-sub
      Routing
      Replay
    A2A standards
      MCP for tools
      A2A protocol
```

</details>

## §4 · Elaboration

### 4.1 Handoff schemas

Every inter-agent message must have a schema:

```typescript
const FXExpertResult = z.object({
  conclusion: z.enum(["ok", "issue", "uncertain"]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    source: z.string(),
    value: z.unknown(),
    timestamp: z.string(),
  })),
  caveats: z.array(z.string()),
  next_action_recommended: z.string().nullable(),
});
```

Validated at the boundary. No untyped strings between agents.

### 4.2 Shared state

For agents that need read-only access to a common context (e.g., the original task, shared memory):

```typescript
interface SharedContext {
  task: TaskSpec;       // immutable
  observations: Map<string, Observation>;  // append-only
  decisions: Map<string, Decision>;        // append-only
}
```

Append-only prevents agents from clobbering each other's data. Versioning catches inconsistencies.

### 4.3 Message bus

For asynchronous or many-agent systems, route messages through a typed bus. Each message has:
- Sender
- Recipient (or topic)
- Payload (validated against schema)
- Causation (which message this responds to)

This is exactly the `agent_messages` table from AdaptLearn's CLAUDE.md — the same pattern.

### 4.4 A2A and standards

MCP standardises tool serving; A2A (Agent-to-Agent) is the emerging standard for inter-agent communication. Both reduce custom-glue code; both add a layer of complexity. Adopt when you have >3 agents and inter-agent integration debt.

## §5 · Problem

Redesign the FX-swap orchestrator-worker system with explicit handoff schemas. Validate every cross-agent message with Zod.

## §6 · Solution

The schemas above + a small message bus = elimination of the misinterpretation failure. Cross-agent integration tests added to the eval suite.

## §7 · Math

### 7.1 Information loss per handoff

Each unstructured handoff loses ~30% of usable information (empirical estimate from agent benchmarks). Structured handoffs preserve ~95%. Three-hop unstructured: 0.7³ = 34% retention. Three-hop structured: 0.95³ = 86%.

## §8 · Tech deep-dive

### 8.1 The synchronous-by-default rule

Start with synchronous calls between agents. Add async only when you can justify the complexity. Async multi-agent systems are 5× harder to debug.

### 8.2 Replay

Log every cross-agent message. To debug a bad outcome, replay the message sequence and inspect each schema-validated payload. This is what makes orchestrator-worker debuggable; peer-to-peer breaks this because there's no canonical sequence.

### 8.3 Versioning schemas across agent deployments

Cross-agent schemas evolve. Without discipline, you ship a worker that emits v2 of a schema to a supervisor that still expects v1, and integration silently fails.

```typescript
const FXExpertResultV2 = z.object({
  schema_version: z.literal("2.0"),
  conclusion: z.enum(["ok", "issue", "uncertain", "out_of_scope"]),  // added one
  confidence: z.number().min(0).max(1),
  evidence: z.array(EvidenceSchema),
  caveats: z.array(z.string()),
  next_action_recommended: z.string().nullable(),
  // new in v2:
  alternative_hypotheses: z.array(z.object({
    conclusion: z.string(),
    confidence: z.number(),
  })).default([]),
});
```

Versioning rules that work in production:
1. **Every payload carries `schema_version`.** Never inferable.
2. **Supervisors register acceptable versions per worker.** Refuse out-of-range.
3. **Workers can emit ≥ 1 prior major version** during transition windows.
4. **Breaking changes bump major; additions bump minor.** Workers should accept either.
5. **Sunset old versions in writing**, with deadlines. Don't accumulate forever.

In Sherpa's hybrid system: when we added `alternative_hypotheses` (v1.x → v2.0), the supervisor was updated first to accept both, workers were upgraded over two weeks, then v1 was deprecated. Zero integration incidents.

### 8.4 Debugging cross-agent failures: the canonical procedure

When a multi-agent task produces a wrong outcome:

```
1. Pull the top-level trace.
2. For each cross-agent message:
   a. Validate against current schema (catches drift).
   b. Compare to what the receiver *expected* (typed handoffs make this trivial).
   c. Check the sender's confidence vs the actual support in evidence.
3. Identify the *first* handoff where the message was either:
   - Wrongly formed (sender bug), or
   - Correctly formed but misinterpreted (receiver bug), or
   - Correctly interpreted but acted on wrongly (decision bug).
4. Reproduce locally with the same message; debug the responsible agent.
```

Without structured handoffs and full trace logging, this procedure is impossible. With them, mean-time-to-diagnose drops from hours to minutes.

### 8.5 Backpressure and shared state contention

If multiple workers write to shared state simultaneously, you get either:
- **Lost updates** (no locking) — invisible corruption.
- **Throughput collapse** (heavy locking) — visible slowdown.

Production-tested patterns:
- **Append-only event log** with monotonic IDs (no locking; writers append, readers project).
- **Optimistic concurrency** with version numbers (writers retry on conflict; works for low-contention).
- **Single-writer model** (one agent owns the canonical state; others propose updates as events).

For Sherpa's multi-agent extension: append-only event log. Each agent emits decisions as events; supervisor projects them into the synthesis. Zero locking; zero corruption; replayable.

## §9 · Unlocks

- 6.3 uses these contracts for debate/voting payloads.
- 6.4 lists anti-patterns that arise from missing contracts.

---

# Lesson 6.3 — Debate & Consensus: When Multiple Agents Help

> **§0 · From last time.** Two agents disagreeing is sometimes a feature (catches blind spots) and sometimes a waste (echo chamber pretending to be diverse).

## §1 · Business scenario

For high-stakes breaks (>$1M), Daniel wants two independent agent analyses. If they agree, ship; if they disagree, escalate.

> *"Like having two analysts cross-check. But how do I make sure they're actually independent?"*

## §2 · Bridge

Debate works when agents have *independent* error modes. Same prompt + same model = correlated errors = false confidence. Different prompts or different models = true independence.

## §3 · Mind map

![Mind map](diagrams/m06/05-debate.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Debate))
    Patterns
      Two-agent agree-disagree
      Multi-round
      Critic-actor
    Independence
      Different prompts
      Different models
      Different data
    Aggregation
      Majority vote
      Weighted by confidence
      Escalate on disagreement
    Cost
      N times single-agent
      Justified by stakes
```

</details>

## §4 · Elaboration

### 4.1 The two-agent pattern

Agent A and Agent B independently classify. Compare. If same: commit. If different: escalate.

For Daniel: A and B use *different prompts* (different framings of the task) and the *same data*. Independence is in framing, not in evidence.

### 4.2 Multi-round debate

Agents propose, critique each other, refine, vote. Useful for genuinely ambiguous tasks (research, synthesis). Cost: 3-5× single-agent. Rarely worth it for classification; often worth it for hypothesis generation.

### 4.3 Critic-actor

One agent acts; a different agent critiques. Essentially Reflexion (Lesson 4.3) externalised across agents. Useful when critic and actor have genuinely different expertise.

### 4.4 The "echo chamber" failure

Same model + similar prompts + same data = correlated errors. Two agents agree because they have the same bias, not because they're both right. *Worse* than single-agent because you have false confidence.

Mitigations:
- Different models for A and B
- Adversarial prompt for one (encouraged to find faults)
- Different evidence sources

## §5 · Problem

Design a debate setup for HSBC's high-stakes breaks. Specify: agent count, model choice, prompt variation, aggregation rule.

## §6 · Solution

- 2 agents: A uses Sonnet 4.6 + Sherpa prompt; B uses Opus + an "adversarial" prompt instructed to find reasons the answer might be wrong.
- Aggregation: agree (same classification + both confidence > 0.8) → commit; otherwise escalate.
- Cost: 3× single-agent (Opus is more expensive). Worth it on the 1% of breaks that need it.

## §7 · Math

### 7.1 Bayesian aggregation

If two independent agents both report confidence 0.85, and their errors are uncorrelated:

$$
P(\text{correct} \mid A, B \text{ agree}) = \frac{p^2}{p^2 + (1-p)^2}
$$

For $p = 0.85$: 0.87. The boost from agreement is small if individual accuracy is already high — independence matters more than agreement.

### 7.2 When debate helps

Debate raises accuracy iff:
$$
P(\text{correct after debate}) > P(\text{correct single agent}) + \text{cost overhead}
$$

For high-stakes, small-volume tasks: usually yes. For high-volume routine tasks: usually no.

## §8 · Tech deep-dive

### 8.1 Adversarial prompt design

"You are the second reviewer. Your job is to find any reason the first answer might be wrong. List two specific challenges, then either confirm or reject the first answer."

Forces structural disagreement, surfaces blind spots.

### 8.2 The escalation cost

Escalation = human time. If your escalation rate is 5%, that's 5% × 45 min × analyst rate. Make sure the cost of escalation is less than the cost of being wrong without it.

### 8.3 Multi-round debate protocols (when 1 round isn't enough)

Two-agent agree-or-escalate is the production default. For truly ambiguous tasks (open-ended research, novel hypothesis generation), multi-round debate adds value.

Standard protocol:

```
Round 1: Agent A and Agent B independently propose answers with reasoning.
Round 2: Each sees the other's reasoning. Each can either:
         - Update their answer (with explicit reason).
         - Stand firm (with rebuttal to the other's points).
Round 3: A judge (separate, neutral) sees both final positions + reasoning.
         Either declares a winner or escalates.
```

Concrete example — Helix hypothesis "Does drug X target pathway Y?":

```
Round 1:
  Agent A: Yes (0.78). Cites papers 1, 3, 7.
  Agent B: No (0.65). Cites paper 2 (counter-evidence) and notes
           papers 3 and 7 are correlational, not causal.

Round 2:
  Agent A: Standing firm. Counter to B: paper 2's counter-evidence
           is in a different cell line; not directly comparable.
           Updated confidence: 0.72.
  Agent B: Conceding partially. Paper 2 critique is correct.
           Updated answer: "Likely targets pathway Y in some cell types,
           not others." Confidence: 0.60.

Round 3 judge:
  Both agents now agree on a more nuanced position. Synthesise:
  "Drug X likely targets pathway Y in cell types similar to those
  in papers 3, 7. Effect in different cell types remains uncertain."
  Confidence: 0.75.
```

The multi-round debate found a better answer than either Round-1 position. Cost: ~6 LLM calls per round × 3 rounds = ~18 calls vs ~2 for single-agent. Justified only for high-stakes, low-volume tasks.

### 8.4 Adversarial debate vs collaborative debate

Two flavours:
- **Adversarial**: explicit roles ("you find faults"). Catches blind spots but can over-disagree.
- **Collaborative**: both agents try to reach truth ("steelman the other position"). Converges faster; risks groupthink.

For HSBC: adversarial (the bank tolerates false-positive escalations more than false-negative commits). For Helix: collaborative (researchers want the best answer, not the most cautious).

### 8.5 When 3+ agents help

Two-agent debate gives you (agree, disagree) — binary. Three-agent gives you majority signal. Beyond three: diminishing returns.

| Agents | Useful signal | Cost |
|---|---|---|
| 1 | One answer | 1× |
| 2 | Agreement check (binary) | 2× |
| 3 | Majority + dissent visible | 3× |
| 5 | Majority + outlier detection + reliability estimate | 5× |
| 7+ | Marginal returns; coordination overhead dominates | >7× |

For production: 2 or 3 agents covers 95% of cases. 5+ is research territory.

## §9 · Unlocks

- 6.4 closes the module with anti-patterns to avoid.

---

# Lesson 6.4 — Multi-Agent Anti-Patterns

> **§0 · From last time.** Lessons 6.1–6.3 covered what works. This lesson catalogues what doesn't.

## §1 · Business scenario

Other teams at HSBC, inspired by Sherpa, started building multi-agent systems for everything. Most failed. Lin (Acme) noticed the same pattern.

> *"What are the warning signs? I want to stop teams before they over-engineer."*

## §2 · Bridge

Multi-agent has real costs. Knowing the anti-patterns lets you stop them at design review.

## §3 · Mind map

![Mind map](diagrams/m06/06-antipatterns.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Anti-patterns))
    Premature multi-agent
      Single agent works
      Adds cost and bugs
    Coordination dominance
      Coordination cost greater than work
    Echo chamber
      Correlated errors
      False confidence
    Handoff loss
      Unstructured messages
      Information bleed
    Recursive over-engineering
      Agent calls agent calls agent
```

</details>

## §4 · Elaboration

### 4.1 Premature multi-agent

The most common: a single agent works, but the team builds 4 agents because "agents are cool." Result: 4× cost, 4× latency, 4× debugging time, same or worse accuracy.

Test: build the single-agent baseline first. Only add a second agent if the baseline fails on a specific task type that warrants specialisation.

### 4.2 Coordination dominance

When coordination cost (orchestrator + message overhead) > work done by workers. Sign: simple tasks taking 10+ messages between agents. Sign: orchestrator's prompt longer than worker prompts.

Fix: collapse to single agent, or move work into the orchestrator.

### 4.3 Echo chamber

Two agents agreeing because they share a bias, not because they're right. Already covered in 6.3.

### 4.4 Handoff loss

Information drops at each agent-to-agent boundary. By the 4th hop, the original task is unrecognisable.

Fix: structured contracts (6.2) + max-hop limits.

### 4.5 Recursive over-engineering

Agent A spawns Agent B to handle a sub-task, which spawns Agent C, which spawns Agent D. By D, no one remembers what A was doing.

Fix: hard cap on recursion depth. 2 levels max for production systems.

## §5 · Problem

Audit a proposed multi-agent design (provided in the lab) for these five anti-patterns.

## §6 · Solution

The lab's example contains 3 of 5. Identify them; propose simplifications. Resulting design: 5 agents → 2 agents → improved metrics across the board.

## §7 · Math

### 7.1 The "coordination tax" formula

$$
\text{Effective work} = \text{Total cost} - \text{Coordination cost}
$$

For an N-agent system with orchestrator-worker:
$$
\text{Coordination} \approx 0.3N \cdot c_{\text{agent}}
$$

At N=5, coordination is ~150% of one agent's cost. If your work doesn't speed up by 1.5× over single agent, you're losing.

## §8 · Tech deep-dive

### 8.1 The "single agent first" rule

Always build single-agent baseline first. Measure. *Then* propose multi-agent only if specific failure modes warrant it.

### 8.2 The 3-agent ceiling

Most production multi-agent systems should have ≤3 agents. Beyond that, complexity outpaces value for most tasks.

### 8.3 The "would a human team work this way?" check

If you wouldn't structure a human team this way for the same task, you probably shouldn't structure agents this way either. Humans evolved to coordinate well; the constraints that make their coordination work also apply to agents.

### 8.4 The cost-attribution problem

In a multi-agent system, when an outcome is wrong, *which agent's fault is it?*

- Workers blame the orchestrator's decomposition.
- Orchestrator blames the workers' execution.
- Synthesis blames the workers' confidence values.

Without per-agent accountability, the system is impossible to improve.

The fix: log per-agent metrics independently.

```typescript
// Per-agent eval metrics (logged separately)
interface AgentMetrics {
  agent_id: string;
  agent_role: "orchestrator" | "worker" | "supervisor" | "specialist";
  accuracy_on_role: number;       // did agent do its job correctly?
  contribution_to_outcome: number; // was the outcome correct given this agent's input?
  cost_per_invocation: number;
  latency_p95: number;
}
```

If accuracy_on_role is high but contribution_to_outcome is low: the agent does its job, but the integration loses the value. That's a coordination bug, not an agent bug.

If accuracy_on_role is low: the agent itself is the problem. Fix that agent in isolation.

Without this split, you debug forever. With it, debugging is mechanical.

### 8.5 The code-review checklist for multi-agent designs

Before approving a multi-agent design, ask:

- [ ] Have we built and measured the single-agent baseline?
- [ ] Have we documented the specific signals (§8.4 of 6.1) that justify multi-agent?
- [ ] Is the topology in the simplest shape that solves the problem?
- [ ] Are all inter-agent messages typed (Zod schemas)?
- [ ] Is every cross-agent message logged for replay?
- [ ] Do we have per-agent eval metrics defined?
- [ ] Is the recursion depth capped (≤ 2 for production)?
- [ ] Is total agent count ≤ 5?
- [ ] Have we identified all four anti-patterns (§4) and documented why each is avoided?
- [ ] Have we defined the rollback path to single-agent if metrics regress?

If you can't tick all 10, the design isn't ready.

### 8.6 The "would a single Sonnet call solve this?" sanity check

A surprising fraction of multi-agent designs collapse to a single, well-prompted Sonnet call. Before any multi-agent investment:

1. Spend an hour writing the best possible single-agent prompt for the task.
2. Run it on 20 representative inputs.
3. Compare to the multi-agent design's hypothesised performance.

If single-agent within 80% of multi-agent's hypothesised quality: ship single-agent, save the engineering.

This check has killed roughly half of proposed multi-agent designs in the orgs I've seen apply it. The savings are enormous.

## §9 · Unlocks

- Module 7 standardises tool integration (MCP) so multi-agent tool sharing isn't bespoke.
- Module 9 covers the cost analysis to detect when multi-agent stops being worth it.

---

# Module 6 — Summary & exit criteria

- [ ] Choose topology for any multi-agent task.
- [ ] Design structured handoff schemas.
- [ ] Decide when debate is worth its cost.
- [ ] Spot anti-patterns at design review.

---

*End of Module 6.*

---
id: pomdp
name: "POMDP (Partially Observable MDP)"
category: foundational
importance: 10
source_lessons: [2.2]
---

# POMDP (Partially Observable MDP)

**Category:** foundational  ·  **Importance:** 10/10
**Introduced in:** Lesson 2.2

## Definition

MDP extended with observation model Ω(o|s',a). Agent never sees state s directly; instead maintains a belief over latent states. The right formalism for LLM agents, where tool outputs are observations and underlying truth is hidden.

## Why it matters

POMDPs are the *correct* mathematical model for LLM agents — even more than MDPs — because:
- The agent's "true state" (the actual nature of the break, the actual relevance of a paper) is never directly observed.
- Tool calls produce observations (GL records, paper text, customer history) but not the latent state.
- Decisions must be made on the agent's belief, not on hidden ground truth.

Knowing the POMDP formalism gives you the vocabulary to reason about LLM-agent behaviour — even though LLM agents don't compute belief updates explicitly.

## Related concepts

- extends → `mdp` (POMDP adds an observation model and belief-state machinery)
- composes → `belief-state` (the belief is the central state object in a POMDP)
- uses → `belief-update` (belief is updated via Bayes after every observation)
- precedes → `implicit-belief` (LLM agents implement a non-distributional approximation)
- applied-in → `sherpa-v1_M4` (Sherpa's investigation loop is a POMDP solver in practice)
- derives → `termination-rule_M4` (confidence > 0.83 rule comes from POMDP cost-asymmetry math)

## Common pitfalls

1. **Treating the agent's first answer as ground truth** — the belief is an approximation; calibration measures how good.
2. **Designing tools without thinking about Ω** — every tool's observation probability matters; if a tool is unreliable, the belief update is too.
3. **Ignoring the value of stopping** — a good agent knows when no observation is worth the cost. EVoI ≤ 0 is the formal stop condition.

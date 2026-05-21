---
id: plan-and-solve-paradigm
name: "Plan-and-Solve Paradigm"
category: foundational
importance: 8
source_lessons: [1.4]
---

# Plan-and-Solve Paradigm

**Category:** foundational  ·  **Importance:** 8/10
**Introduced in:** Lesson 1.4

## Definition
A two-phase agent paradigm: (1) Planning phase — the LLM generates an explicit, structured multi-step plan before taking any actions, (2) Solve phase — the LLM executes each plan step, potentially using ReAct sub-loops per step. Wang et al. (2023). Key advantage: exposes the plan for human review and allows early abort. Key failure mode: the plan can be wrong and the agent may rigidly follow it even when observations contradict it (plan fixation).

## Notes
Connects to Module 4 lesson 4.4 (Sherpa planning). "Plan fixation" is the named failure mode to watch for.

## Related concepts
- specializes → `react-paradigm` (Plan-and-Solve is a variant of ReAct that adds hierarchical structure: explicit planning phase before action loops, improving decomposition.)
- contrasts → `react-paradigm` (Plan-and-Solve commits to a plan upfront before execution, contrasting with ReAct's online, step-by-step reasoning. Plan-and-Solve often uses ReAct sub-loops for individual subgoals.)

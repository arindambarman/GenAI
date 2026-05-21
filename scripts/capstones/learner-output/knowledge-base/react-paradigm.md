---
id: react-paradigm
name: "ReAct Paradigm"
category: foundational
importance: 10
source_lessons: [1.4]
---

# ReAct Paradigm

**Category:** foundational  ·  **Importance:** 10/10
**Introduced in:** Lesson 1.4

## Definition
Reasoning + Acting interleaved loop: the LLM alternates between (1) Thought — explicit natural-language reasoning about what to do next, (2) Action — emitting a tool call or output, and (3) Observation — receiving the tool result back into context. This loop repeats until a terminal condition. Published by Yao et al. (2022). Core insight: making the reasoning trace explicit improves decision quality and debuggability compared to silent chain-of-thought.

## Notes
The most widely-deployed agent paradigm. Foundation for Module 4 (Sherpa v1). Three-component loop (Thought/Action/Observation) is the teachable unit.

## Related concepts
- specializes → `agent-definition` (ReAct is a specific instantiation of the modern LLM agent definition, implementing the reasoning-action loop concretely.)
- extends ← `reflexion-paradigm` (Reflexion extends ReAct by adding episodic memory for learning from failures, creating a stateful learning mechanism rather than stateless loops.)
- specializes ← `plan-and-solve-paradigm` (Plan-and-Solve is a variant of ReAct that adds hierarchical structure: explicit planning phase before action loops, improving decomposition.)
- alternative_to ← `codeact-paradigm` (CodeAct unifies reasoning and action into code representation instead of separate thought-action alternation, trading structure for expressiveness in tool composition.)
- contrasts ← `plan-and-solve-paradigm` (Plan-and-Solve commits to a plan upfront before execution, contrasting with ReAct's online, step-by-step reasoning. Plan-and-Solve often uses ReAct sub-loops for individual subgoals.)
- specializes ← `paradigm-failure-modes` (Each paradigm's failure modes are characteristics of that implementation; ReAct's loop risks exemplify the general concept.)

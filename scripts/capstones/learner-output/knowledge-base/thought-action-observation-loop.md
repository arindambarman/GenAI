---
id: thought-action-observation-loop
name: "Thought-Action-Observation (TAO) Loop"
category: foundational
importance: 9
source_lessons: [1.4]
---

# Thought-Action-Observation (TAO) Loop

**Category:** foundational  ·  **Importance:** 9/10
**Introduced in:** Lesson 1.4

## Definition
The core execution cycle of a ReAct agent: (1) Thought — the LLM reasons about the current state and decides what to do; (2) Action — a tool call or answer is emitted; (3) Observation — the tool result is appended to context; the loop repeats until a terminal condition is reached.

## Notes
The mechanical implementation of ReAct. Every subsequent module that builds agents implements this loop in some form.

## Related concepts
- composes ← `react-paradigm` (The TAO loop is the mechanical implementation of the ReAct paradigm; ReAct is defined precisely by how it structures the thought-action-observation cycle.)

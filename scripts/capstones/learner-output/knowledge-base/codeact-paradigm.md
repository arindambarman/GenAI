---
id: codeact-paradigm
name: "CodeAct Paradigm"
category: foundational
importance: 8
source_lessons: [1.4]
---

# CodeAct Paradigm

**Category:** foundational  ·  **Importance:** 8/10
**Introduced in:** Lesson 1.4

## Definition
An agent paradigm where the LLM expresses its actions as executable code (typically Python) rather than as structured tool-call JSON. The code is executed in a sandbox, and stdout/stderr is fed back as the observation. Wang et al. (2024). Key advantages: composability (a single code block can call multiple tools, apply logic, and process results), expressiveness (loops, conditionals, data transforms). Key failure modes: code execution errors are harder to recover from; security requires robust sandboxing.

## Notes
Connects to Module 7.3 (sandboxing). The most expressive paradigm but with highest security surface area.

## Related concepts
- alternative_to → `react-paradigm` (CodeAct unifies reasoning and action into code representation instead of separate thought-action alternation, trading structure for expressiveness in tool composition.)

---
id: workflow
name: "Workflow (Dial 1–2)"
category: foundational
importance: 7
source_lessons: [1.3]
---

# Workflow (Dial 1–2)

**Category:** foundational  ·  **Importance:** 7/10
**Introduced in:** Lesson 1.3

## Definition
A process where an LLM is called at one or more steps but the overall control flow is predetermined by the engineer. The LLM may select among a fixed set of branches (dial 2), but it does not dynamically compose tool chains or spawn sub-agents. More testable than full agents; appropriate when the space of decisions is bounded and enumerable.

## Notes
The "sweet spot" for many enterprise use cases that don't need full autonomy.

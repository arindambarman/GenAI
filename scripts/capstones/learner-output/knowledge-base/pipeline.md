---
id: pipeline
name: "Pipeline (Dial 0)"
category: foundational
importance: 7
source_lessons: [1.3]
---

# Pipeline (Dial 0)

**Category:** foundational  ·  **Importance:** 7/10
**Introduced in:** Lesson 1.3

## Definition
A data-processing chain with no LLM calls or with LLM calls at fixed, predetermined positions in a static DAG. Inputs flow through a fixed sequence of transformations; no branching or decision-making by an LLM. Highest predictability, lowest cost, easiest to test and audit. Appropriate when all steps are known, deterministic, and the problem is fully specified.

## Notes
Baseline against which agents are contrasted. Many "agent" use cases are better served by pipelines.

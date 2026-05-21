---
id: reflexion-paradigm
name: "Reflexion Paradigm"
category: foundational
importance: 8
source_lessons: [1.4]
---

# Reflexion Paradigm

**Category:** foundational  ·  **Importance:** 8/10
**Introduced in:** Lesson 1.4

## Definition
An extension of ReAct that adds a self-critique loop: after a trajectory fails (or after each episode), the agent generates verbal self-reflection on what went wrong and stores this reflection in memory for the next attempt. The agent then retries with its own critique as additional context. Shinn et al. (2023). Key advantage over plain ReAct: systematic error correction without gradient updates. Key failure mode: the agent's critique can be wrong or self-serving.

## Notes
Extends ReAct with memory-backed self-correction. Used in Module 4 lesson 4.3 (Sherpa self-critique).

## Related concepts
- extends → `react-paradigm` (Reflexion extends ReAct by adding episodic memory for learning from failures, creating a stateful learning mechanism rather than stateless loops.)
- specializes ← `paradigm-failure-modes` (Reflexion's failure mode (poor learning from weak feedback) is tied to its core mechanic of learning from past attempts.)

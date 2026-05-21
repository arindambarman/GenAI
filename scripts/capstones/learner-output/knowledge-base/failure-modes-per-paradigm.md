---
id: failure-modes-per-paradigm
name: "Paradigm Failure Modes"
category: operational
importance: 8
source_lessons: [1.4]
---

# Paradigm Failure Modes

**Category:** operational  ·  **Importance:** 8/10
**Introduced in:** Lesson 1.4

## Definition
Named failure modes for each major paradigm: ReAct — "rabbit hole" (agent loops on one tool repeatedly, never reaching terminal state); Reflexion — "self-serving critique" (agent convinces itself its wrong approach was fine); Plan-and-Solve — "plan fixation" (agent follows outdated plan despite contradicting observations); CodeAct — "execution error cascade" (one code error corrupts subsequent steps). Knowing failure modes allows engineers to add targeted mitigations (timeouts, step limits, plan re-evaluation triggers).

## Notes
Highly practical. Each failure mode maps to a specific mitigation pattern introduced in later modules (e.g., retry logic in 9.2, reflection in 4.3).

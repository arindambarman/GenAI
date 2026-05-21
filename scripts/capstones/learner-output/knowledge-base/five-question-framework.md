---
id: five-question-framework
name: "Five-Question Agent Decision Framework"
category: foundational
importance: 9
source_lessons: [1.3]
---

# Five-Question Agent Decision Framework

**Category:** foundational  ·  **Importance:** 9/10
**Introduced in:** Lesson 1.3

## Definition
A structured five-question test to decide whether to use an agent, workflow, or pipeline: (1) Is the task non-deterministic or does the path vary per input? (2) Does it require multi-step reasoning or tool use? (3) Is the output hard to verify? (4) Does it need persistent state? (5) Does the ROI justify the cost of agency?

## Notes
Practical decision tool used throughout the course in business scenario exercises. Connects to Module 11 ROI modeling.

## Related concepts
- uses → `agent-vs-workflow` (The five-question framework is the operational decision tool that implements the agent-vs-workflow-vs-pipeline distinction in practice.)
- uses ← `cost-of-agency` (Cost of agency is a central input to the five-question framework (question 5: does ROI justify agency cost?), and motivates using workflows/pipelines when possible.)
- extends ← `paradigm-comparison-matrix` (The paradigm comparison matrix extends the agent-vs-workflow decision logic to the next level: once you've decided to build an agent, which paradigm (ReAct, Reflexion, etc.) should you choose?)

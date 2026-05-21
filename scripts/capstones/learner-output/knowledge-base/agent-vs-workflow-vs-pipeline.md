---
id: agent-vs-workflow-vs-pipeline
name: "Agent vs. Workflow vs. Pipeline Decision Framework"
category: foundational
importance: 10
source_lessons: [1.3]
---

# Agent vs. Workflow vs. Pipeline Decision Framework

**Category:** foundational  ·  **Importance:** 10/10
**Introduced in:** Lesson 1.3

## Definition
A five-question framework to determine the right dial setting for a given problem: (1) Is the task decomposable into deterministic steps? → pipeline. (2) Are steps known in advance? → workflow. (3) Does the system need to choose its own tool sequence? → agent (dial 3). (4) Does it need sub-goals and spawned agents? → agent (dial 4). (5) What is the cost of error? — higher cost pushes toward lower dial settings with human oversight. The framework prevents over-engineering.

## Notes
The most practically actionable concept in Module 1. Directly addresses the "most common mistake" called out in the module objectives.

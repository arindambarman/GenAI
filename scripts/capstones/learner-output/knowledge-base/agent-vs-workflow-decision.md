---
id: agent-vs-workflow-decision
name: "Agent vs Workflow vs Pipeline Decision Framework"
category: foundational
importance: 9
source_lessons: [1.3]
---

# Agent vs Workflow vs Pipeline Decision Framework

**Category:** foundational  ·  **Importance:** 9/10
**Introduced in:** Lesson 1.3

## Definition
A five-question framework for determining whether to build an agent (high autonomy required), a workflow (orchestrated steps with conditional branching but fixed control flow), or a pipeline (deterministic sequence of steps) based on autonomy requirements, exception handling complexity, and cost tolerance.

## Notes
Critical anti-pattern: using agents when workflows suffice. Module objective 3. Emphasizes cost of agency; forward reference to Module 11 (business cases).

## Related concepts
- uses ← `agency-dial` (The agency dial is the measurement used in the decision framework to determine where a system falls on the spectrum, guiding the agent-vs-workflow choice.)
- uses ← `cost-of-agency` (Cost-of-agency calculation is a key criterion in the decision framework for determining when autonomy is financially justified.)

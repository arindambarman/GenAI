---
id: agency-dial
name: "Agency Dial (0–4)"
category: foundational
importance: 10
source_lessons: [1.1]
---

# Agency Dial (0–4)

**Category:** foundational  ·  **Importance:** 10/10
**Introduced in:** Lesson 1.1

## Definition
A continuous 0–4 scale measuring the degree of autonomous decision-making in a system: 0 = no autonomy (pure pipeline), 1 = single LLM call, 2 = LLM with tools (fixed flow), 3 = LLM chooses tool sequence, 4 = LLM sets own goals and spins up sub-agents. Replaces the binary "is it an agent?" question with an operational, measurable spectrum.

## Notes
Central framing concept for the entire course. Enables the decision framework in lesson 1.3 — "what dial setting do I need?"

## Related concepts
- extends → `agent-definition` (The agency dial operationalizes the agent definition into a continuous spectrum, replacing the binary "is it an agent?" question with a measurable 0–4 scale.)
- uses → `agent-vs-workflow-decision` (The agency dial is the measurement used in the decision framework to determine where a system falls on the spectrum, guiding the agent-vs-workflow choice.)
- uses ← `agent-definition` (The agency dial provides the operational measure by which agents are defined and distinguished from workflows. It operationalizes the abstract definition.)
- uses ← `workflow-vs-agent` (The decision framework uses the agency dial (and cost considerations) to guide practitioners on whether to invest in agent-level autonomy or stick with workflows.)

---
id: agent-definition
name: "Agent Definition (Russell-Norvig + Modern LLM)"
category: foundational
importance: 10
source_lessons: [1.1]
---

# Agent Definition (Russell-Norvig + Modern LLM)

**Category:** foundational  ·  **Importance:** 10/10
**Introduced in:** Lesson 1.1

## Definition
An agent is anything that perceives its environment through sensors and acts upon it via actuators (Russell-Norvig). The modern LLM-agent extension adds four properties: (1) LLM as reasoning engine, (2) tool use to affect the world, (3) memory across steps, (4) goal-directed multi-step behavior. The key distinguishing feature vs. a chatbot is persistent action in the world beyond a single response.

## Notes
Grounds the course in classical AI theory while bridging to modern LLM practice. Four properties explicitly called out.

## Related concepts
- extends ← `agency-dial` (The agency dial operationalizes the agent definition into a continuous spectrum, replacing the binary "is it an agent?" question with a measurable 0–4 scale.)
- specializes ← `react-paradigm` (ReAct is a specific instantiation of the modern LLM agent definition, implementing the reasoning-action loop concretely.)
- uses → `agency-dial` (The agency dial provides the operational measure by which agents are defined and distinguished from workflows. It operationalizes the abstract definition.)
- specializes ← `llm-agents` (LLM agents are a modern specialization of the classical agent definition (Russell-Norvig), using transformers as the reasoning core instead of explicit rule systems or learned policies.)

---
id: llm-agent-definition
name: "LLM Agent (Modern Definition)"
category: foundational
importance: 10
source_lessons: [1.1]
---

# LLM Agent (Modern Definition)

**Category:** foundational  ·  **Importance:** 10/10
**Introduced in:** Lesson 1.1

## Definition
A system where an LLM acts as the central reasoning engine, perceiving inputs (text, tool outputs, memory), deciding which actions to take (tool calls, sub-tasks), and iterating until a goal is achieved — characterized by four properties: perception, reasoning, action, and memory.

## Notes
Contrasted with Russell-Norvig's classic definition; emphasizes LLM as the "reasoning engine" distinguishing it from prior symbolic and RL agents.

## Related concepts
- uses ← `agency-dial` (The agency dial operationalizes the LLM agent definition by providing a continuous scale from pipeline (level 0) to full autonomy (level 4), making the abstract definition measurable.)
- composes → `four-agent-properties` (The four properties (perception, reasoning, action, memory) are the structural components that together define what an LLM agent is.)
- precedes ← `russell-norvig-agent` (The Russell-Norvig definition is the historical precursor that the modern LLM agent definition extends and refines, providing conceptual continuity.)
- precedes ← `rl-agents` (RL agents contributed the MDP formalism, reward/evaluation thinking, and exploration vs. exploitation concepts that are foundational to modern LLM agent design.)

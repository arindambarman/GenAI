---
id: llm-agents
name: "LLM Agents (2022+)"
category: foundational
importance: 10
source_lessons: [1.2]
---

# LLM Agents (2022+)

**Category:** foundational  ·  **Importance:** 10/10
**Introduced in:** Lesson 1.2

## Definition
Agents that leverage pre-trained large language models as reasoning cores, circumventing reward training by using in-context learning, prompting, and tool use. Replace explicit policies with learned representations in transformers, enabling broad generalization across tasks.

## Notes
Modern paradigm; combines symbolic planning structure (from agents of 1950s-1990s) with RL intuitions (exploration, reward signals via prompting) and transformer generalization. Central to the entire course.

## Related concepts
- extends → `symbolic-agents` (Modern LLM agents inherit the planning and reflection concepts from symbolic agents (1950s-1990s), but replace hand-coded logic with learned representations.)
- extends → `reinforcement-learning-agents` (LLM agents leverage RL intuitions (MDPs, reward signals via prompting, exploration) while replacing explicit policy learning with in-context learning from large pre-trained models.)
- specializes → `agent-definition` (LLM agents are a modern specialization of the classical agent definition (Russell-Norvig), using transformers as the reasoning core instead of explicit rule systems or learned policies.)

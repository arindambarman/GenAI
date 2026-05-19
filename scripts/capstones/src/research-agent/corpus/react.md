---
id: react-2022
title: "ReAct: Synergizing Reasoning and Acting in Language Models"
authors: ["Shunyu Yao", "Jeffrey Zhao", "Dian Yu", "Nan Du", "Izhak Shafran", "Karthik Narasimhan", "Yuan Cao"]
year: 2022
venue: ICLR 2023
tags: [agent, reasoning, tool-use, prompt-engineering]
---

# ReAct: Synergizing Reasoning and Acting in Language Models

## Abstract
We explore the use of LLMs to generate both reasoning traces and task-specific actions in an interleaved manner, allowing for greater synergy between the two: reasoning traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with and gather additional information from external sources such as knowledge bases or environments.

## Key contributions
1. The ReAct paradigm: alternating Thought, Action, Observation steps in a single LLM generation stream.
2. Empirical demonstration on HotpotQA (knowledge-intensive QA) and ALFWorld (interactive decision-making).
3. Shows that reasoning + acting beats either alone, especially on tasks requiring multi-hop reasoning.

## Method
The model is prompted to produce outputs in a structured format:
- `Thought: <reasoning step>`
- `Action: <tool call>`
- `Observation: <tool result, prepended for next step>`

Few-shot examples teach the format. The loop repeats until the model emits a final `Answer:`.

## Results
- HotpotQA: 27.0 EM (vs 22.4 CoT-only, 25.7 Act-only)
- ALFWorld: 71% success (vs 41% Act-only)

## Limitations
- Per-step reasoning cost is non-trivial; long traces consume context.
- Brittle to prompt variations; quality of few-shot examples matters significantly.
- No explicit termination heuristic — relies on model judgment.

## Influence
ReAct became the de facto baseline for LLM-agent design and the namesake of the "ReAct loop" pattern used in most modern agent frameworks (LangChain, LangGraph, OpenAI Assistants, Anthropic Tool Use).

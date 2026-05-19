---
id: multi-agent-debate-2023
title: "Improving Factuality and Reasoning in Language Models through Multiagent Debate"
authors: ["Yilun Du", "Shuang Li", "Antonio Torralba", "Joshua Tenenbaum", "Igor Mordatch"]
year: 2023
venue: arXiv preprint
tags: [multi-agent, debate, factuality, reasoning]
---

# Multiagent Debate

## Abstract
We propose a complementary approach in which multiple instances of language models engage in multiple rounds of debate to arrive at a common final answer. We find that this approach significantly enhances mathematical and strategic reasoning across a number of tasks.

## Key contributions
1. Demonstrates measurable accuracy gains from multi-agent debate vs single-agent baseline.
2. Identifies the conditions under which debate helps: tasks with verifiable answers or where independent reasoning surfaces blind spots.
3. Shows that "convergence after disagreement" is more valuable than "agreement on first answer."

## Method
N independent LLM instances propose answers, then critique each other's reasoning over multiple rounds. After K rounds, a final answer is selected by majority or judgment of a separate agent.

## Results
- Math (GSM8K-style): 73% → 85% with 3-agent, 2-round debate
- Strategic reasoning: similar magnitude improvements
- Factuality: modest gains (5-10 pp)

## Limitations
- N× cost (each round multiplies by agent count).
- Echo-chamber risk: agents using the same model + similar prompts have correlated errors.
- Works best when independence is enforced (different prompts, different models).

## When to use
- High-stakes, low-volume tasks where accuracy is worth the cost.
- Tasks with verifiable or judgable answers.
- Tasks where systematic biases of a single model are concerning.

## When NOT to use
- High-volume routine tasks (cost is prohibitive).
- Tasks without clear ground truth (debate may not converge).
- Tasks with tight latency budgets.

---
id: plan-and-solve-2023
title: "Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models"
authors: ["Lei Wang", "Wanyu Xu", "Yihuai Lan", "Zhiqiang Hu", "Yunshi Lan", "Roy Ka-Wei Lee", "Ee-Peng Lim"]
year: 2023
venue: ACL 2023
tags: [agent, planning, chain-of-thought, prompting]
---

# Plan-and-Solve Prompting

## Abstract
We propose Plan-and-Solve (PS) Prompting, which addresses the missing-step error in zero-shot CoT by first devising a plan to divide the entire task into smaller subtasks, then carrying out the subtasks according to the plan.

## Key contributions
1. Explicit plan generation step before execution.
2. PS+ variant adds "pay attention to calculation" and "extract relevant variables" instructions.
3. Improves zero-shot reasoning on math (GSM8K, AQUA-RAT) and commonsense (StrategyQA) benchmarks.

## Method
Two-phase prompting:
- **Phase 1 (Plan)**: "Let's first understand the problem and devise a plan to solve the problem."
- **Phase 2 (Solve)**: "Let's carry out the plan, calculate intermediate variables, and solve the problem step by step."

Unlike ReAct, the plan is generated upfront, not interleaved with actions.

## Results
- GSM8K: 58.2% (zero-shot CoT) → 58.2% (PS) → 59.3% (PS+) with text-davinci-003
- More substantial gains on harder benchmarks (AQUA-RAT, SVAMP)

## Limitations
- Plans can be wrong; PS doesn't replan during execution.
- Less useful for tasks without natural sub-structure.
- Quality of plan depends heavily on prompt wording.

## Comparison to ReAct
PS is "plan-first, execute-second." ReAct is "decide-as-you-go." PS shines when sub-tasks are knowable upfront; ReAct shines when next action depends on what you've discovered.

## Influence
The Plan-and-Solve pattern is widely deployed in production agents where time budgets are tight (since planning upfront beats discovering structure via trial-and-error).

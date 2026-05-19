---
id: reflexion-2023
title: "Reflexion: Language Agents with Verbal Reinforcement Learning"
authors: ["Noah Shinn", "Federico Cassano", "Edward Berman", "Ashwin Gopinath", "Karthik Narasimhan", "Shunyu Yao"]
year: 2023
venue: NeurIPS 2023
tags: [agent, self-improvement, reinforcement-learning, reflection]
---

# Reflexion: Language Agents with Verbal Reinforcement Learning

## Abstract
We propose Reflexion, a novel framework to reinforce language agents not by updating weights, but instead through linguistic feedback. Concretely, Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials.

## Key contributions
1. Verbal reinforcement learning: storing natural-language "lessons" from failed trials and prepending them to future attempts.
2. Three components: Actor (does the task), Evaluator (scores the trial), Self-Reflection (generates verbal feedback).
3. Empirical improvements on AlfWorld, HotpotQA, and HumanEval; 91% on HumanEval (Python coding) with GPT-4, beating the strongest prior baseline.

## Method
Reflexion runs in iterative trials:
1. Actor generates a trajectory using ReAct.
2. Evaluator scores the trial (binary success/failure, or graded).
3. If failure: Self-Reflection LLM call writes a "lesson" reflecting on what went wrong.
4. Next trial: lesson is prepended; actor tries again.

The episodic memory persists across trials but resets per task.

## Results
- HumanEval (Python): 88% pass@1 → 91% with Reflexion (3 trials)
- HotpotQA: 33% → 40% accuracy
- AlfWorld: 53% → 75% success

## Limitations
- N× token cost (one full trajectory per retry).
- Requires evaluator signal — works best when correctness is checkable.
- Reflection quality bounded by the underlying LLM.

## Comparison to ReAct
Reflexion adds a meta-loop on top of ReAct. ReAct is one trajectory; Reflexion runs multiple trajectories with learned-between-trial lessons.

---
id: bitter-lesson-2019
title: "The Bitter Lesson"
authors: ["Richard Sutton"]
year: 2019
venue: Personal essay (incompleteideas.net)
tags: [philosophy, scaling, ai-history]
---

# The Bitter Lesson

## Abstract (essay)
The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation are ultimately the most effective, and by a large margin. Researchers have repeatedly tried to build clever, domain-specific solutions; these have been repeatedly outperformed by general methods that scale.

## Key argument
Two paths in AI research:
1. **Build in human knowledge**: encode domain expertise as features, rules, or architectures. Short-term wins. Long-term plateau.
2. **General methods + computation**: search, learning, scale. Short-term loss to method 1. Long-term dominance.

The "bitter" lesson is that researchers consistently choose path 1 because it's intellectually satisfying, and consistently get crushed by path 2 once compute grows.

## Examples cited
- **Chess**: hand-crafted evaluation functions lost to alpha-beta search + Moore's Law.
- **Go**: shape-based knowledge lost to MCTS + deep RL (AlphaGo).
- **Speech recognition**: hand-crafted phoneme features lost to deep learning.
- **Computer vision**: hand-engineered features (SIFT, HOG) lost to convnets.

## Implication for agent design
For LLM agents:
- Don't over-engineer the orchestration layer (it's clever solution that won't scale).
- Don't out-clever the model with elaborate prompting hacks.
- Prefer general patterns (ReAct, structured output) that will benefit from model improvements.
- Build for the model that ships in 2 years, not the one you have today.

## Criticism
Some researchers note the bitter lesson conflates "general" with "scalable," and that scaffolding (memory, tool use, agency) is not the same as hand-encoded domain knowledge. The lesson is a guideline, not a law.

## Influence
The essay is widely cited as justification for minimalist agent architectures. The phrase "the bitter lesson" has become shorthand for "the elaborate engineering won't survive the next model upgrade."

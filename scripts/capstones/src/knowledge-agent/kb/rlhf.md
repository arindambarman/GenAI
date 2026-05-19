---
id: rlhf
title: RLHF (Reinforcement Learning from Human Feedback)
tags: [training, alignment, reinforcement-learning]
related: [policy-gradient, dpo]
---

# RLHF: Reinforcement Learning from Human Feedback

A training technique for language models that uses human preferences as a reward signal. Popularised by InstructGPT (Ouyang et al. 2022) and ChatGPT.

## The pipeline (three stages)

**Stage 1: Supervised fine-tuning (SFT)**
- Train on human-written demonstrations of the desired behaviour
- Produces a baseline policy

**Stage 2: Reward model training**
- Collect pairs of responses to the same prompt
- Human labellers indicate which is better
- Train a reward model to predict human preference

**Stage 3: RL optimisation**
- Use PPO (Proximal Policy Optimization) to optimise the policy against the reward model
- KL penalty keeps the policy from drifting too far from the SFT baseline
- Output: a model that produces responses scoring high on the reward model

## Why it works
- Direct optimisation for human-preferred outputs
- Captures nuances ("be helpful, harmless, honest") that are hard to express as a loss function
- Better generalisation than pure SFT

## Limitations
- Expensive: requires preference labels at scale
- Reward hacking: model finds ways to score high without being genuinely better
- Bias: reflects labellers' biases
- Sycophancy: agrees with the user rather than being honest

## Successors
- DPO (Direct Preference Optimization, Rafailov 2023): closed-form objective, no RL
- RLAIF (RL from AI Feedback): synthetic preferences from a stronger model

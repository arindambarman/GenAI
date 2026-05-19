---
id: policy-gradient
title: Policy Gradient Methods
tags: [reinforcement-learning, training, mathematics]
related: [rlhf, dpo]
---

# Policy Gradient Methods

A family of reinforcement learning algorithms that directly optimise a parameterised policy π_θ(a|s) using gradient ascent on expected reward.

## The fundamental theorem

The policy gradient theorem (Williams 1992; Sutton et al. 1999):

∇_θ J(θ) = E_{τ ~ π_θ} [ Σ_t ∇_θ log π_θ(a_t | s_t) · R(τ) ]

In English: nudge the policy to make trajectory τ more likely in proportion to its reward.

## Why direct over Q-learning?
- Works in continuous action spaces (Q-learning needs argmax over actions)
- Stochastic policies natural (good for exploration and partial observability)
- Stable for large action spaces (text generation has 50K+ tokens to choose)

## REINFORCE
The simplest policy gradient algorithm. High variance — needs baseline subtraction or actor-critic to be practical.

## PPO (Proximal Policy Optimization)
The workhorse of modern RL. Clips the policy update to prevent large destructive steps. Used in:
- RLHF for language models (InstructGPT, Claude, GPT-4)
- AlphaStar (StarCraft II)
- OpenAI Five (Dota 2)

## DPO (Direct Preference Optimization)
Closed-form objective derived from PPO + KL penalty. Skips the RL machinery; trains directly on preference pairs. Simpler, cheaper, often comparable quality.

## LLM connection
Policy gradient is the foundation of RLHF (which made ChatGPT-style assistants possible). Without policy gradients, scaling preferences to a useful objective wouldn't be tractable.

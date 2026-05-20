---
id: dpo
title: DPO (Direct Preference Optimization)
tags: [training, alignment, preferences]
related: [rlhf, policy-gradient]
---

DPO (Rafailov et al. 2023) is a closed-form alternative to RLHF. Instead of training a reward model and then using PPO to optimise against it, DPO directly optimises the policy on preference pairs using a simple cross-entropy-like loss derived from the KL-constrained RL objective.

## Why it matters
- Eliminates the reward model (one fewer model to train and maintain)
- More stable training than PPO
- Comparable or better quality on most benchmarks
- Simpler infrastructure → faster iteration

## Limitations
- Requires preference pairs, not free-form labels
- Less control over the optimisation than PPO
- Cannot easily incorporate online feedback

## Practical use
DPO has largely replaced PPO-RLHF in many open-source fine-tuning pipelines. Most preference fine-tuning of open models (Llama, Mistral) uses DPO.

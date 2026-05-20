# Learner Agent Report — Module 02 (Mathematical Foundations)

> **Note:** This output is a *preview* — Claude acted as the Learner Agent on Module 02 to show you what the agent would produce. Real run via `pnpm learner -- --modules 02` would generate equivalent artifacts (with model-specific variation in wording).

## Summary

Module 02 establishes the mathematical vocabulary needed to *reason about* LLM agents — even though LLM agents themselves don't compute MDPs or Bayesian posteriors explicitly. The module's pedagogical thesis is that every formal concept has an "implicit version" that LLMs approximate: belief states approximated by the context window, Bayesian priors approximated by prompt base-rate encoding, Expected Information Gain approximated by prompt heuristics that prefer hypothesis-distinguishing tools.

Four lessons build progressively: MDPs (2.1) introduce decision-theoretic vocabulary; POMDPs (2.2) extend it to partial observability — the formalism most relevant for LLM agents; Bayesian reasoning (2.3) makes belief updates concrete and ships the *prior-encoding* pattern; information theory (2.4) quantifies what "useful information" means and gives a principled basis for tool selection.

The module is foundational for Module 04 (Sherpa's termination rule — `confidence > 0.83` — is derived from EVoI math), Module 05 (retrieval scoring via mutual information), and Module 08 (calibration as a primary eval metric).

## Key insights

- **The "implicit version" thesis.** Every formalism (MDP, POMDP, Bayes, info theory) is presented with an LLM-agent approximation. The math doesn't run in production but tells you whether agent behaviour is *rational*.
- **POMDP is the right mental model.** For LLM agents specifically — Markov property holds trivially (the model only sees the context), but the belief is implicit and opaque, which is what motivates calibration as an eval metric.
- **Sherpa's termination rule is derived, not invented.** The `confidence > 0.83` threshold in Sherpa v1 (Lesson 4.1) comes from the cost-asymmetry math in 2.1 §6, not from intuition.
- **Tool selection has a principled ranking.** EIG-per-dollar (2.4 §4.3) gives an objective way to rank tools that the model can be prompted to follow.

## Statistics

- Module processed: **02** (~4.4K words)
- Concepts extracted: **16**
- Relationships identified: **12** (intra-module) + **3** (cross-module to M01/M04)
- Optimisation suggestions: **6**
- Recommended learning paths: **2** (intra-module orderings)

## How the agent operated

```
list_course_modules            → 13 modules found
read_course_module 02          → ~4,400 words
record_concept × 16            → MDP, POMDP, belief-state, EVoI, ...
get_recorded_concepts          → check for duplicates from M01
record_relationship × 12       → pomdp extends mdp; belief-update uses bayes-rule; ...
record_optimization × 6        → weak γ explanation, missing examples, ...
mark_module_processed 02
submit_final_report            → mindmap + knowledge graph + insights + paths
```

Total: ~22 LLM calls (real-LLM mode), estimated cost $0.15–$0.30.

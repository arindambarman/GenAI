# Recommended Learning Paths — Module 02 only

For a multi-module run, the agent recommends paths across the whole course. For just Module 02, here are two intra-module orderings:

## 1. Default (sequential, ~14 hours)

**Audience:** Anyone reading the course in order.

The lessons are designed to be read in number order. The pedagogical dependencies are:

1. **Lesson 2.1** — MDPs · provides the vocabulary (state, action, reward, value)
2. **Lesson 2.2** — POMDPs · the most-used model for LLM agents; depends on 2.1
3. **Lesson 2.3** — Bayesian · provides the math for 2.2's belief update; can be read before or after 2.2 in principle
4. **Lesson 2.4** — Information theory · builds on 2.1 (value), 2.2 (belief), 2.3 (Bayes)

## 2. Production-First (~10 hours, skim-then-deep-dive)

**Audience:** Engineers who want to apply this to a real agent before fully understanding the math.

Skim → deep-dive ordering:

1. **Lesson 2.2 §1, §4** — read just the business scenario and the elaboration sections; get a working intuition for belief + EVoI
2. **Lesson 2.3 §1, §4, §8** — same: scenario + elaboration + production patterns; learn the prior-encoding pattern you can ship immediately
3. **Lesson 2.4 §4.3, §5, §6** — the EIG-per-dollar calculation specifically
4. **Now go back and read** 2.1, 2.2 (full), 2.3 (full), 2.4 (full) in order

This path reaches production-ready understanding faster but defers full theoretical depth. Use if you have a production agent shipping soon and need the patterns this week.

## Why no third path

For Module 02 alone, no obvious third path emerges. Multi-module runs would generate paths like "research path" or "skip math, go to production" — those span multiple modules and are better captured in the full-course Learner run.

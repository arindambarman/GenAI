---
id: evoi
name: "Expected Value of Information (EVoI)"
category: operational
importance: 9
source_lessons: [2.2]
---

# Expected Value of Information (EVoI)

**Category:** operational  ·  **Importance:** 9/10
**Introduced in:** Lesson 2.2

## Definition

EVoI(a) = E_o[V(b'_o)] − V(b) − c(a). How much value an action's information gain produces, minus its cost. Stop and answer when no action's EVoI is positive. Operational basis for agent termination rules.

## In English

For each candidate action (typically a tool call):
- Project what your belief would look like after each possible observation
- Compute the expected value of acting on the post-observation belief
- Subtract the cost of the action

If no action's EVoI is positive, the agent should stop and commit on the current belief.

## Why it matters

EVoI is the **formal justification** for Sherpa's `confidence > 0.83` termination rule:
- Cost of a wrong answer: $200 (analyst rework + audit log)
- Cost of correct answer: $42 (analyst time saved)
- Break-even confidence: 200 / (42+200) = **0.826** → round to 0.83

Without the EVoI frame, this threshold looks arbitrary. With it, it's derived from cost asymmetry.

## Related concepts

- uses → `belief-update` (computing EVoI requires belief projection)
- bounded-by → `vopi` (Value of Perfect Information caps EVoI)
- derives → `termination-rule_M4` (Sherpa's confidence threshold)
- alternative-to → `expected-information-gain` (EIG is similar; EVoI weights by value, EIG by info content alone)

## Production pattern

LLM agents don't compute EVoI directly. Instead:

1. Ask the model to emit `CONFIDENCE: <0-1>` with every answer.
2. In deterministic code, check `if confidence > threshold then commit else continue`.
3. Tune `threshold` from EVoI math given your task's cost structure.

This puts the budget rule in code, not in prompts — more reliable.

## When EVoI ≤ 0 for all tools

- The agent has converged: no observation can change the answer enough to be worth the cost.
- The agent should commit on the current belief.
- This is the formal version of "I've seen enough; let me decide."

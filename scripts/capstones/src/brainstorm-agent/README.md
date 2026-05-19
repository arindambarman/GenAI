# Idea Brainstorming Agent

A structured-brainstorming agent that applies multiple techniques to generate diverse ideas, scores them objectively, and surfaces a top-3 with concrete next steps.

## Architecture

| Component | Module reference |
|---|---|
| Agent loop | Lesson 4.1 (ReAct) |
| Technique dispatch | Lesson 4.4 (Plan-and-Solve: plan = which techniques to apply) |
| Scoring tool | Lesson 8.1 (eval rubrics) |
| Structured output via `submit_report` | Lesson 3.3 (constrained decoding) |
| 4-dimensional scoring | Lesson 2.4 (multi-criterion decision-making) |

## Techniques the agent can apply

- `analogy` — "How does nature / another industry solve this?"
- `decomposition` — Break into sub-problems, solve each, recombine.
- `inversion` — "How would we guarantee failure?" → each failure becomes an idea to avoid.
- `recombination` — Mash up existing partial solutions in new ways.
- `what_if` — Remove a constraint, see what's possible, approximate back.
- `user_journey` — Walk through who's affected, brainstorm per persona.
- `extreme_cases` — 10× scale / 1/10× cost — what's essential?

## Run

```sh
# Default topic (support response time)
pnpm --filter @adaptlearn/capstones brainstorm

# Custom topic
pnpm --filter @adaptlearn/capstones brainstorm "How do we reduce LLM token costs by 50% without dropping quality?"

# Mock mode (no API key)
ANTHROPIC_API_KEY="" pnpm --filter @adaptlearn/capstones brainstorm
```

## Output

1. **Trace** — agent's technique application sequence + scoring + selection
2. **All ideas** with 4-dimension scores (novelty, feasibility, impact, cost) and weighted composite
3. **Top 3** with explicit reasoning + concrete next steps
4. **Summary** — narrative wrap-up

## Scoring rubric

The agent scores each idea on:

| Dimension | 0 (low) | 5 (medium) | 10 (high) |
|---|---|---|---|
| Novelty | obvious | mildly creative | surprising and new |
| Feasibility | science-fiction | stretch | trivial to start tomorrow |
| Impact | noise | useful for some | transformative |
| Cost | nearly free | sizeable budget | multi-year, multi-million |

Composite: `0.35 × impact + 0.30 × feasibility + 0.20 × novelty − 0.15 × cost`

Weights chosen to emphasise impact and feasibility while penalising high cost. Tunable per use case.

## Tools

- `apply_technique(technique, topic)` — returns guidance for the named technique; agent then generates ideas in its next thought
- `score_ideas([{id, novelty, feasibility, impact, cost}])` — ranks ideas by weighted composite
- `submit_report({topic, ideas, top_three, summary})` — terminal call

## Extension ideas

- **Multi-agent debate** (Module 6): two brainstorm agents with different prompts; merge their ideas
- **Iterative refinement**: after top-3, re-generate variants of each
- **Domain-specific techniques**: e.g., TRIZ patterns for engineering problems
- **Cost-aware budgeting**: cap LLM spend per session via budget gate
- **Persistence**: store reports in the knowledge agent's KB for later retrieval

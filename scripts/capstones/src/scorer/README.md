# Scorer — Per-Concept Learning Progress with Spaced Repetition

Track mastery of the 53 course concepts. Self-rate after study; the tool computes decay, surfaces what to review next, and produces a markdown progress report.

No LLM calls — pure local computation. Free to use, runs in <1s.

## Quick start

```sh
# 1. Initialise (writes learner-progress/progress.json with 53 concepts at depth=0)
pnpm --filter @adaptlearn/capstones scorer init

# 2. After studying a concept, rate yourself (depth 0-5, confidence 0-5)
pnpm --filter @adaptlearn/capstones scorer rate agency-dial --depth 4 --confidence 4

# 3. After several ratings, ask what to review next
pnpm --filter @adaptlearn/capstones scorer review

# 4. Get a full report
pnpm --filter @adaptlearn/capstones scorer report > report.md
```

## The model

For each concept:

```
peak_score      = depth × (1 + 0.2 × min(evidence_count, 3))
half_life_days  = 2^depth × 3                    # 3d → 6d → 12d → 24d → 48d → 96d
decay_factor    = exp(-days_since_review / half_life_days)
decayed_score   = peak_score × decay_factor
```

**Status from decayed_score:**

| Status | Range | Meaning |
|---|---|---|
| 🟢 mastered | ≥ 3.5 | Reviewed recently AND depth ≥ 4 |
| 🟡 wobbly | 2.0 – 3.5 | Either weak depth or stale review |
| 🔴 weak | < 2.0 | Needs work |
| ⚪ unstarted | depth = 0 | Never touched |

## Bloom scale (depth)

| Depth | Verb | Example for "agency dial" |
|---|---|---|
| 0 | unstarted | "I don't know what this is" |
| 1 | remember | "I know it's a 0-4 scale of LLM autonomy" |
| 2 | understand | "I can explain why dial 4 is risky" |
| 3 | apply | "I can place a new system on the dial" |
| 4 | analyse / evaluate | "I can defend dial choices for real tradeoffs" |
| 5 | create | "I can design new systems explicitly anchored to a dial setting" |

Confidence is separate from depth — you can be confident at depth 2 (you really do understand it conceptually) or under-confident at depth 4 (you can apply it but feel uncertain).

## Commands

```sh
scorer init [--force] [--path <p>]               initialise progress.json
scorer rate <id> --depth N --confidence N        update a concept
       [--note "..."] [--source self|quiz|judge|artifact]
scorer review [--limit N]                        what to review next
scorer report                                    full progress markdown
scorer status <id>                               one-concept deep dive
scorer list [--module Mn] [--status weak|wobbly|mastered|unstarted]
scorer help
```

## Example session

```
$ scorer init
✓ Initialised learner-progress/progress.json with 53 concepts.

$ scorer rate agency-dial --depth 4 --confidence 4 --note "Q1.1 4/4 rubric hits"
✓ Agency Dial (0-4)
  depth=4 confidence=4 status=🟢 mastered
  peak=4.8  decayed=4.8  half-life=48d

$ scorer rate react-loop --depth 3 --confidence 3
✓ ReAct Loop (TAO)
  depth=3 confidence=3 status=🟡 wobbly
  peak=3.6  decayed=3.6  half-life=24d

$ scorer review
📚 Top 5 concepts to review next:

1. 🔴 POMDP  [M2, importance 10]
     id: pomdp
     reason: high-importance-unstarted · depth=0
...
```

## The review heuristic

`scorer review` ranks concepts by review urgency:

1. **decay-overdue** — mastered concepts (depth ≥ 4) whose decay has dropped them below 3.5
2. **wobbly** — concepts at risk of slipping
3. **weak** — concepts that need work
4. **high-importance-unstarted** — concepts with importance ≥ 8 you haven't touched

Priority within each tier is weighted by `importance`.

## Where progress lives

`learner-progress/progress.json` at the repo root (gitignored if you want).

The file is the source of truth. Edit it directly with a text editor if you want — the schema is human-readable. You can also keep multiple files per learner (`scorer rate ... --path alice.json`).

## Integration with the rest of the toolkit

| Use it with... | How |
|---|---|
| **Connected questions** | After attempting a question, use the rubric hits as evidence: `scorer rate <id> --depth N --source quiz --ref Q2.2 --note "4/5 rubric hits"` |
| **Knowledge Agent** | Each concept ID in the scorer matches the Knowledge Agent's concept IDs — query the KB for details on a concept your score says is weak |
| **Learner Agent** | After a real learner run, you can `scorer rate` the concepts it extracted as evidence you're now familiar with them |
| **Pipeline** | Pipeline outputs are concepts — promote them as evidence of "I've seen this discussed" (low depth = 1) |

## Limitations

- **Self-rated by default** — inherits self-rating biases. Add `--source quiz` or `--source judge` when scoring against the rubrics or LLM-judged questions for objectivity.
- **Single learner per file** — no multi-user / cohort support yet. Could add by extending `learner_id` and storing multiple progress files.
- **Decay model is one-size-fits-all** — half-life formula doesn't tune to your forgetting curve. Could add per-concept tuning if you find some concepts decay faster.

## Extension ideas

- **Quiz mode**: integrate with the connected questions answer bank — sample a Q each session, LLM-judge against rubric, auto-update scores
- **Diff reports**: "what changed since last week?"
- **Visual heat-map**: colour each concept on the knowledge-graph.svg by score (red→green gradient)
- **Pre/post comparison**: snapshot before reading a module, again after, quantify learning gain
- **Cohort mode**: aggregate across learners; identify shared weak spots in a team

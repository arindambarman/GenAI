# Capstone Pipeline — Self-Improvement Loop

Chains all four capstone agents into a closed loop that *uses the course's own discipline to improve the course*. This is the practical demonstration of Module 12.1 (Self-Improvement) applied to its own teaching material.

## The pipeline

```
1. learn          → Learner Agent reads the course, extracts concepts + optimisations
2. populate-kb    → Knowledge Agent (add mode) adds top concepts as KB notes
3. brainstorm     → Brainstorm Agent proposes N missing topics, scored across 4 dimensions
4. research       → Research Agent grounds each proposed topic against the corpus
5. synthesise     → Deterministic stage composes draft lesson proposals from the above
```

Each stage's output flows into the next via a shared `PipelineState` object. Stages can be skipped if data is already present (e.g. `--use-cached-learner` skips stage 1).

## Run

```sh
# Mock mode — instant, free, exercises every stage
CAPSTONE_MOCK=true pnpm --filter @adaptlearn/capstones pipeline

# Real LLM, full pipeline (~$3-5, 5-15 minutes)
pnpm --filter @adaptlearn/capstones pipeline

# Real LLM, subset (cheaper)
pnpm --filter @adaptlearn/capstones pipeline -- --modules 01,02 --num-topics 3 --no-research

# Reuse previously-cached learner output (skip stage 1)
pnpm --filter @adaptlearn/capstones pipeline -- \
  --use-cached-learner learner-output-preview-m02/concepts.json --num-topics 3
```

## Output

```
pipeline-output/
├── summary.md              ← top-level report (stage timings, costs, output counts)
├── proposed-topics.md      ← all proposed topics with scores and rationale
├── learner-output/         ← stage 1 artifacts (concepts.json, mindmap.mmd, etc.)
└── proposals/              ← one markdown file per draft lesson
    ├── idea_1.md
    ├── idea_2.md
    └── ...
```

Each `proposals/<id>.md` is a draft lesson outline with:
- Proposed lesson ID + insertion point in the course
- Rationale (why this is missing)
- Outline using the course's 10-section template (business scenario, key concepts, math, examples)
- Supporting citations from the research stage
- Estimated time + dependencies

## Architecture

| File | Role |
|---|---|
| `schema.ts` | `PipelineState`, `ProposedTopic`, `GroundedTopic`, `DraftProposal`, `PipelineConfig` |
| `orchestrator.ts` | Generic `runPipeline(stages, state, hooks)` — sequential execution with cost/timing tracking and per-stage error handling |
| `stages.ts` | Five stages, each wrapping one capstone agent's entry point + helpers for synthesis |
| `run.ts` | CLI with `--modules`, `--use-cached-learner`, `--num-topics`, `--no-research`, `--out` flags |
| `mock.ts` | Composite mock handler — dispatches to per-agent mocks based on system prompt sniffing |

## Why this matters (pedagogical insight)

The course teaches:
- **Module 4** — agent architecture (ReAct, memory, reflection, planning)
- **Module 6** — multi-agent orchestration with handoffs
- **Module 8** — eval discipline
- **Module 12** — self-improvement via mining production traces

This pipeline is all four applied at once, recursively, against the course itself:
- The agents are **orchestrated** (M6 orchestrator-worker pattern)
- The handoffs are **typed** (PipelineState as the schema)
- The output is **evaluable** (faithfulness scores per grounded topic)
- The system **improves the system** (proposes course extensions from observed gaps)

Whether or not the proposed topics are good is the meta-eval question.

## Cost estimation

Real-LLM mode, full pipeline:
- Stage 1 Learner (13 modules): ~$2-3
- Stage 2 KB populate (5 concepts): ~$0.10
- Stage 3 Brainstorm: ~$0.10
- Stage 4 Research (5 topics × ~$0.10 each): ~$0.50
- Stage 5 Synthesis: $0 (deterministic)
- **Total: ~$3-5**

Use `--use-cached-learner` if you've already run the learner to cut the largest cost (~70% of total).

## Mock mode behaviour

Mock mode runs end-to-end in <5 seconds with canned responses from each agent's existing mock. Output structure is identical to real-LLM mode, but the content is the pre-scripted demo data.

Useful for:
- Verifying the architecture works after changes
- CI smoke tests
- Demoing the integration without spending API credit

## What this demonstrates from the course

| Concept | Where it appears in the pipeline |
|---|---|
| Agency dial (M1) | Orchestrator sits at dial 2 (deterministic stages); each agent operates at dial 3 |
| Plan-and-Solve (M1.4, M4.4) | The pipeline IS a Plan-and-Solve, with stages = plan steps |
| Memory tiers (M4.2) | KB populate stage is "procedural memory" — the system's accumulated KB |
| Multi-agent coordination (M6) | Four agents orchestrated via shared state |
| Handoff schemas (M6.2) | `PipelineState` schema enforced across all stages |
| Eval gates (M8) | Each stage produces a `StageResult` with ok/cost/duration |
| Cost attribution (M9.3) | Per-stage cost tracking in `StageResult` |
| Self-improvement (M12.1) | The whole pipeline is self-improvement applied to the course |

## Extension ideas

- **Critic loop**: add a 6th stage where a critic LLM scores the proposals; reject low-quality ones; re-brainstorm.
- **Multi-iteration**: run the pipeline N times, accumulating proposals across runs.
- **Auto-PR**: if a proposal is judged high-quality, automatically open a PR against `course/` with the new lesson stub.
- **Per-domain**: parameterise the corpus so the pipeline works on other courses or knowledge bases.
- **Web UI tab**: add a 5th tab for the pipeline (the Web UI already has 4 — easy to extend).

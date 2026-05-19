# Learner Agent

An agent that reads the entire course (`course/module-XX-*.md`), extracts key concepts, identifies how they connect, suggests optimisations, and produces:

- a **knowledge base** (one markdown note per concept)
- an **overall mindmap** (hierarchical Mermaid)
- a **knowledge graph** (concept relationships, Mermaid)
- **recommended learning paths** for different audiences
- a **summary + key insights**
- an **optimisations report** (sequencing issues, missing examples, etc.)

## Architecture

| Component | Module reference |
|---|---|
| Agent loop | Lesson 4.1 (ReAct) |
| Incremental state via tools | Lesson 4.2 (memory tiers — episodic via tool storage) |
| Per-module read + extract | Lesson 4.4 (Plan-and-Solve with module-level sub-tasks) |
| Mindmap + knowledge graph synthesis | Lesson 5.4 (compaction / hierarchical summarisation) |
| Optimisation suggestions | Lesson 8.1 (eval-driven feedback) |

## Tools

| Tool | Purpose |
|---|---|
| `list_course_modules` | discover what's available |
| `read_course_module(id)` | read full text of a module |
| `record_concept({id, name, definition, source_lessons, category, importance})` | persist a concept |
| `record_relationship({from, to, type, reason, source_lesson})` | persist an edge |
| `record_optimization({type, target_lessons, current_state, suggestion, rationale, priority})` | persist a suggestion |
| `get_recorded_concepts({category?, name_contains?})` | query previously-recorded concepts to avoid duplicates and find cross-module links |
| `mark_module_processed(id)` | track progress |
| `submit_final_report({mindmap, knowledge_graph, learning_paths, key_insights, summary})` | terminal — runner aggregates outputs |

## Run

```sh
# All 13 modules (real LLM — ~$1-3, 3-10 min)
pnpm --filter @adaptlearn/capstones learner

# Subset (faster, cheaper)
pnpm --filter @adaptlearn/capstones learner -- --modules 01,02,04

# Custom output dir
pnpm --filter @adaptlearn/capstones learner -- --out my-learner-output

# Mock mode (no API key; ~5 seconds; 3-module canned demo)
ANTHROPIC_API_KEY="" pnpm --filter @adaptlearn/capstones learner
```

Also available via the web UI's **🎓 Learner** tab at http://localhost:3005.

## Output files

All written to `learner-output/` (or `--out` dir):

```
learner-output/
├── summary.md                   ← human-readable overview
├── concepts.json                ← all extracted concepts
├── relationships.json           ← all identified edges
├── optimizations.md             ← suggestions grouped by priority
├── mindmap.mmd                  ← hierarchical Mermaid mindmap
├── knowledge-graph.mmd          ← concept graph in Mermaid
├── learning-paths.md            ← recommended sequences per audience
├── color-legend.md              ← category → colour map
└── knowledge-base/              ← one markdown note per concept
    ├── agency-dial.md
    ├── react-loop.md
    ├── sherpa-v1.md
    └── ...
```

## Concept categories

- **foundational** — definitions / frameworks (agency dial, ReAct, MDP)
- **architecture** — design patterns (orchestrator-worker, hybrid agent)
- **operational** — production patterns (retry, durable execution, observability)
- **math** — formal frameworks (POMDP, Bellman, entropy)
- **safety** — prompt injection, CaMeL, audit
- **business** — ROI, build-vs-buy, change management
- **frontier** — future / advanced (self-improvement, embodied, debate)

## Relationship types

- `uses` — A uses/depends on B
- `extends` — A extends B with additional capability
- `specializes` — A is a specific case of B
- `alternative_to` — A is an alternative to B
- `contrasts` — A and B are deliberately contrasted in the course
- `composes` — A is composed of B (B is a sub-part)
- `precedes` — B should be learned before A (sequencing)

## Cost estimation

- 13 modules × ~7K tokens = ~91K input tokens
- ~50-80 LLM calls (one per concept + one per module read + synthesis)
- Output tokens dominate cost (Lesson 9.3 pattern)
- **Typical real run: $1-3, 3-10 minutes**

Use `--modules` to limit scope for testing. Mock mode is free.

## How to view the outputs

```sh
# Render the mindmap and graph as SVG (uses mmdc from the course-agent package)
cd learner-output
npx mmdc -i mindmap.mmd -o mindmap.svg -b transparent
npx mmdc -i knowledge-graph.mmd -o knowledge-graph.svg -b transparent
```

Or paste into [mermaid.live](https://mermaid.live).

## Extension ideas

- **Iterate**: re-run after course edits; diff against prior `concepts.json` to track changes
- **Integrate with Knowledge Agent**: feed extracted concepts into the knowledge agent's KB as the seed
- **Auto-apply optimisations**: filter high-priority optimisations and generate PRs against course markdown
- **Quality score per lesson**: aggregate per-lesson concept density / clarity ratings
- **Compare**: run the same Learner against different courses; identify pedagogical patterns

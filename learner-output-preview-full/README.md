# Full-Course Preview — Mindmap + Knowledge Graph (M1-M13)

Preview of what the Learner Agent would produce for the *complete* course (all 13 modules + capstones). Produced by Claude acting as the agent across all modules — a real `pnpm learner` run would generate equivalent artifacts with model-specific variation.

## Files

| File | What it shows |
|---|---|
| [mindmap.mmd](mindmap.mmd) + [mindmap.svg](mindmap.svg) | Hierarchical view organized by module (M1-M13). ~80 leaf concepts in 11 top-level branches. |
| [knowledge-graph.mmd](knowledge-graph.mmd) + [knowledge-graph.svg](knowledge-graph.svg) | Concept relationships across modules. ~50 nodes in 13 subgraphs, with cross-module bridges shown as bold `===` edges. |

## Mindmap structure

11 top-level branches:

1. **M1-3 Foundations** — agency dial, paradigms, MDP/POMDP/Bayes/info-theory, attention, prompts
2. **M4 Single-Agent Sherpa** — v1 → v5 evolution
3. **M5 Memory & RAG** — vector stores, hybrid retrieval, agentic RAG, compaction
4. **M6 Multi-Agent** — topologies, handoffs, debate, anti-patterns
5. **M7 Tools & MCP** — registry, MCP, sandboxing, capability tokens
6. **M8 Evaluation** — regression eval, LLM-as-judge, observability
7. **M9 Production** — durable execution, retry, cost, runbooks
8. **M10 Safety & Audit** — injection, CaMeL, red-team, audit trail
9. **M11 Business** — ROI, build-vs-buy, change management
10. **M12 Advanced** — self-improvement, DPO, LoRA, continual learning
11. **M13 Frontier** — capability directions, governance

Each branch has ~5-8 leaf concepts.

## Knowledge graph structure

13 subgraphs (one per module). Two types of edges:

- **Thin arrows** (`-->`, `-.uses.->`) — intra-module relationships
- **Bold double-line bridges** (`===`) — the "spine of the course": load-bearing cross-module connections

### Color legend

| Category | Color | Examples |
|---|---|---|
| **foundational** | red | agency-dial, paradigms |
| **math** | pink | POMDP, belief-state, EVoI |
| **architecture** | blue | Sherpa versions, RAG, MCP |
| **operational** | green | eval, calibration, durable execution |
| **safety** | dark red | injection, CaMeL, audit |
| **business** | yellow | ROI, build-vs-buy |
| **frontier** | teal | self-improvement, governance |

### The 22 cross-module bridges

The bold `===` edges in the graph are the bridges between modules. Highlights:

| From | → | To | Meaning |
|---|---|---|---|
| agency-dial (M1) | → | sherpa-v1 (M4) | frames every architectural decision |
| pomdp (M2) | → | sherpa-v1 (M4) | formal model of agent behaviour |
| evoi (M2) | → | eval-gate (M4) | derives confidence > 0.83 threshold |
| bayes-rule (M2) | → | 7-block prompt (M3) | encoded as base-rate prompts |
| eig-per-dollar (M2) | → | tool-registry (M7) | ranks tools by info/cost |
| belief-state (M2) | → | memory-compaction (M5) | approximated by context management |
| strict-tool-use (M3) | → | sherpa-v1 (M4) + mcp-server (M7) | used by all agents |
| sherpa-v5 (M4) | → | memory-compaction, agentic-rag, orchestrator-worker, durable-execution, regression-eval, camel | the production agent composes everything from M5-M10 |
| citation-faithfulness (M5) | → | audit-trail (M10) | feeds compliance |
| calibration-ece (M8) | → | belief-state (M2) | reflects quality of implicit belief |
| red-team (M10) | → | camel (M10) | tests the safety pattern |
| audit-trail (M10) | → | governance (M13) | required by regulatory frameworks |
| roi-model (M11) | → | sherpa-v5 | justifies the deployment |
| change-mgmt (M11) | → | sherpa-v5 | operationalises the rollout |
| self-improvement (M12) | → | sherpa-v5 | targets the production agent |
| capability-frontier (M13) | → | sherpa-v5 | shapes the 3-year plan |

The course is shaped like a hub-and-spoke: **Sherpa v5 is the hub**, with foundations feeding into it (M1-3 → M4) and operations/safety/business/frontier extending from it (M5-M13 → M4).

## How to view

```sh
# Already rendered as SVG — open in any image viewer or browser
start mindmap.svg            # Windows
xdg-open mindmap.svg          # Linux
open mindmap.svg              # macOS
```

Or paste either `.mmd` file into [mermaid.live](https://mermaid.live) for an interactive view.

## How to regenerate via the real Learner Agent

```sh
cd C:\Users\arind\projects\GenAI\.claude\worktrees\silly-nobel-b7621f
pnpm --filter @adaptlearn/capstones learner -- --out my-full-output
```

Estimated cost (real-LLM mode): **~$2-3, 5-10 minutes**. The output would include not just the mindmap + knowledge graph but also `concepts.json` (~100 concepts), `relationships.json` (~80 edges), `optimizations.md` (~30-40 suggestions), `learning-paths.md` (3-5 paths for different audiences), and `knowledge-base/<concept-id>.md` for every extracted concept.

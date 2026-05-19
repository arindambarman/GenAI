# Knowledge Management Agent

An agent that owns a personal/team knowledge base — answers questions, organises content, and grows over time.

## Three modes

| Mode | What it does | Terminal tool |
|---|---|---|
| `query` | Answer a question by retrieving and synthesising notes | `submit_answer` |
| `organize` | Audit the KB: clusters, orphans, suggested links, gaps | `submit_organization` |
| `add` | Incorporate new content as one or more notes (with linking) | `submit_answer` (summary) |

## Run

```sh
# Query mode
pnpm --filter @adaptlearn/capstones knowledge query "How does attention work?"

# Organize mode (no args needed)
pnpm --filter @adaptlearn/capstones knowledge organize

# Add mode
pnpm --filter @adaptlearn/capstones knowledge add "DPO is a closed-form alternative to RLHF..."

# Help
pnpm --filter @adaptlearn/capstones knowledge help
```

## Tools

- `query_kb(query, k)` — search notes by keyword
- `read_note(id)` — full text of a note
- `list_all_notes()` — global view (for organize mode)
- `add_note({id, title, tags, related, body})` — create new note
- `link_notes(from, to)` — bidirectional related-to link
- `submit_answer({...})` — terminal for query/add modes
- `submit_organization({...})` — terminal for organize mode

## Knowledge base format

Each note in `src/knowledge-agent/kb/` is a markdown file with frontmatter:

```markdown
---
id: attention
title: Attention Mechanism
tags: [transformer, neural-network]
related: [transformer, qkv]
---

# Attention Mechanism
... body markdown ...
```

The agent reads and writes these files via the tools. The KB is **mutable** — running `add` mode creates new files; running `organize` may suggest links you can apply.

## Seed KB (6 notes)

- `attention` — the QKV mechanism
- `transformer` — the architecture
- `embedding` — semantic vectors
- `rag` — retrieval-augmented generation
- `rlhf` — RL from human feedback
- `policy-gradient` — RL fundamentals

## Architecture references

| Component | Module reference |
|---|---|
| Three-mode CLI | Lesson 4.1 (agent loop) |
| Tools | Lesson 3.2 (strict tool use), 7.1 (registry) |
| KB as retrieval + write substrate | Lesson 5.1 (vector stores), 5.3 (agentic RAG) |
| `submit_answer` with citations | Lesson 5.3 (citation faithfulness) |
| `organize` mode | Lesson 4.4 (Plan-and-Solve, mapped to "review then propose") |
| Bidirectional links | Lesson 6.2 (typed handoffs as schemas) |

## Extension ideas

- **Vector embeddings**: replace keyword search with semantic search (one stage at a time).
- **Versioning**: every note edit creates a new version (audit trail).
- **Conflict detection**: surface notes that contradict each other.
- **Auto-tag suggestions**: when adding notes, suggest tags based on similar existing notes.
- **Knowledge graph export**: emit a Cytoscape-compatible JSON for visualisation.

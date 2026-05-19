# `@adaptlearn/capstones`

Three working capstone agents built on the patterns from the Agentic Systems course (Modules 1–10):

| Agent | What it does | Mode |
|---|---|---|
| **Research Agent** | Synthesises answers from a curated corpus with verifiable citations | One-shot Q&A |
| **Knowledge Management Agent** | Owns a personal/team markdown KB; answers, organises, adds | Three modes: query / organize / add |
| **Idea Brainstorming Agent** | Generates diverse ideas via structured techniques; scores and ranks | One-shot ideation |

All three share a common architecture (ReAct loop, strict tool use, Zod schemas, mock mode).

## Quick start

```sh
# Install dependencies
pnpm install

# Run each agent (mock mode by default — no API key needed)
pnpm --filter @adaptlearn/capstones research
pnpm --filter @adaptlearn/capstones knowledge query "How does attention work?"
pnpm --filter @adaptlearn/capstones brainstorm "How do we cut LLM costs in half?"

# With a real LLM
export ANTHROPIC_API_KEY=sk-ant-…
pnpm --filter @adaptlearn/capstones research "What is the bitter lesson?"
```

## Shared infrastructure

```
src/shared/
├── env.ts            # Env vars + mock-mode detection
├── llm.ts            # Anthropic SDK wrapper + mock hook
├── tool.ts           # ToolRegistry + Zod-to-JSON-Schema converter
├── trace.ts          # Trace types + pretty-printer
└── agent-loop.ts     # Generic ReAct loop (used by all three agents)
```

## Per-agent layout

```
src/<agent>/
├── schema.ts     # Zod schemas for inputs and outputs
├── tools.ts      # Tool definitions (search, read, submit, etc.)
├── prompts.ts    # System prompt(s) following the 7-block structure (Lesson 3.4)
├── mock.ts       # Canned response sequence for offline demos
├── agent.ts      # Main entry point — orchestrates the loop
├── run.ts        # CLI runner
└── README.md     # Per-agent docs
```

## Architecture reference

Each agent implements the patterns from specific course lessons:

- **ReAct loop** — Lesson 4.1 (Sherpa v1)
- **Strict tool use** — Lesson 3.2 (eliminates hallucinated tool names)
- **Constrained structured output** — Lesson 3.3 (Zod-validates every submission)
- **Citation faithfulness** — Lesson 5.3 (post-hoc audit)
- **Memory tiers** — Lesson 4.2 (knowledge agent owns episodic + procedural memory)
- **Plan-and-Solve** — Lesson 4.4 (brainstorm agent picks N techniques upfront)

## Mock mode

When `ANTHROPIC_API_KEY` is unset (or `CAPSTONE_MOCK=true`), each agent uses a canned response sequence from its `mock.ts`. The architecture runs end-to-end; the LLM outputs are scripted. Useful for:

- CI / smoke tests
- Offline demos
- Verifying the agent loop works before incurring API cost

## Cost in real mode

Approximate cost per run with Claude Sonnet 4.6 (mid-2026 pricing):

| Agent | LLM calls (typical) | Cost per run |
|---|---|---|
| Research | 8–12 | $0.05–$0.15 |
| Knowledge (query) | 4–6 | $0.02–$0.06 |
| Knowledge (organize) | 2–3 | $0.01–$0.03 |
| Knowledge (add) | 5–7 | $0.02–$0.05 |
| Brainstorm | 6–10 | $0.05–$0.12 |

Per-task costs come from output tokens dominating (Lesson 9.3).

## Extending

To add a new capstone agent:

1. Create `src/<agent>/` with `schema.ts`, `tools.ts`, `prompts.ts`, `agent.ts`, `run.ts`, `README.md`.
2. Define your tools in `tools.ts` using the `ToolDefinition` interface from `src/shared/tool.ts`.
3. Define the agent loop entry in `agent.ts` using `runAgentLoop()` from `src/shared/agent-loop.ts`.
4. Add a CLI in `run.ts` and wire it up in the package's `bin` and `scripts`.
5. Add a `mock.ts` for offline demo runs.

The shared loop handles everything (LLM calls, tool dispatch, retries, error injection, schema validation). You author the tools, prompts, and terminal "submit" handler; the loop does the rest.

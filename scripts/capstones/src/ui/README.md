# Capstone UI

A single-page web UI for all three capstone agents (Research, Knowledge, Brainstorm) with live streaming progress. No frontend framework — vanilla HTML/JS. No backend framework — Node's built-in `http`. Zero new dependencies.

## Start

From the repo root (worktree):

```sh
pnpm --filter @adaptlearn/capstones ui
```

Then open **http://localhost:3005** in your browser.

The page header shows whether you're in MOCK MODE (no API key) or using a real model. Use the tabs to switch between the three agents.

## What you'll see

Each tab has:
1. A **form** — input fields specific to that agent
2. A **live progress** stream — each thought, tool call, and result as it happens (NDJSON over HTTP)
3. A **formatted result** — final synthesis / answer / report rendered nicely

## Server endpoints

- `GET /` — serves the HTML page
- `GET /health` — `{ ok: true, mockMode, model }`
- `POST /api/research` — body `{ question }` → NDJSON stream
- `POST /api/knowledge` — body `{ mode, input }` where `mode` ∈ {query, organize, add} → NDJSON stream
- `POST /api/brainstorm` — body `{ topic, num_techniques, ideas_per_technique }` → NDJSON stream

NDJSON event types:
- `{ type: "info", message }` — startup info (mode / model)
- `{ type: "progress", step }` — a single trace step (thought / tool_call / tool_result / answer)
- `{ type: "result", data }` — final structured output
- `{ type: "error", message }` — fatal error

## Port

Default: 3005. Override with `CAPSTONE_UI_PORT=4000 pnpm --filter @adaptlearn/capstones ui`.

## Why no frontend framework

The UI is ~30 KB of HTML/CSS/JS. A React app would be 200 KB+ before doing anything useful. For three agent tabs with form input + streaming text, vanilla is plenty.

## Why no backend framework

Node's built-in `http` is sufficient for 4 routes and streaming. Adding Express or Hono would add a dependency and ~50 ms of cold start. Not worth it at this scale.

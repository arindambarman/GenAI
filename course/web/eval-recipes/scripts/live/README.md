# Live example — run an eval *against the agent* and compare

This is the end-to-end version of one metric — **schema-conformance** — wired to the **live
`proposal-pricing` agent** instead of a hardcoded fixture. Use it as the template for taking any
of the 41 self-contained scripts in `../` from "demo on a fixture" to "gate on the real agent."

## The three layers

```
dataset.ts ──▶ runner.ts ──▶ scorer.ts ──▶ run.ts ──▶ baseline.json
  (inputs)     (the agent)   (the metric)  (compare)   (what "good" was)
```

| File | Role |
|---|---|
| `dataset.ts` | The golden set of deals we send the agent. |
| `runner.ts`  | Invokes the agent and returns its real output + cost/latency. Has a **live** runner (Claude Agent SDK) and a **mock** runner (offline). |
| `scorer.ts`  | The metric — same Zod schema-conformance logic as `../schema-conformance.eval.ts`, but exported. |
| `run.ts`     | Runs dataset → runner → scorer, aggregates, **compares to `baseline.json`**, prints PASS/FAIL, exits 0/1. |
| `baseline.json` | The recorded "known-good" outcome to compare against (regression detection). |

## Setup

```bash
cd course/web/eval-recipes/scripts/live
npm install
```

## Run it offline first (no API key)

The mock runner replays recorded healthy output, so you can see the whole flow with zero cost:

```bash
npm run eval          # == npx tsx run.ts   (EVAL_RUNNER defaults to "mock")
```

You'll get the per-deal table, the aggregate outcome, the comparison vs `baseline.json`, and `PASS ✓`.

## Run it against the LIVE agent

Needs an Anthropic API key and the SDK (installed by `npm install`). The runner discovers
`proposal-pricing` from `.claude/agents/` using `cwd = AGENT_PROJECT_ROOT`.

```bash
export ANTHROPIC_API_KEY=sk-ant-...           # PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."
export AGENT_PROJECT_ROOT="C:/Users/arind/projects/GenAI"   # where .claude/agents/* live
EVAL_RUNNER=sdk npm run eval
```

On Windows PowerShell:

```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:AGENT_PROJECT_ROOT="C:/Users/arind/projects/GenAI"
$env:EVAL_RUNNER="sdk"; npx tsx run.ts
```

Now the numbers are **real**: the agent produces quotes, the scorer validates each against the
schema, and you see the live first-pass valid rate, cost/deal, and latency/deal — compared to baseline.

### Useful env vars
| Var | Default | Meaning |
|---|---|---|
| `EVAL_RUNNER` | `mock` | `sdk` to call the live agent. |
| `AGENT_PROJECT_ROOT` | `C:/Users/arind/projects/GenAI` | Folder containing `.claude/agents/`. |
| `EVAL_MODEL` | *(unset)* | Override the model for the whole run; unset → the subagent's own `model: sonnet`. |

## How the comparison works

`run.ts` loads `baseline.json` and reports the delta on three axes — **valid rate, cost/deal,
latency/deal**. The gate **fails** (exit 1) if any of:

- first-pass valid rate `< 98%` (the metric threshold), or
- valid rate dropped `> 0.5pp` vs baseline (a **regression**), or
- any agent run errored.

This is exactly what you'd put behind a CI merge gate or a pre-prompt-change check.

### Record a new baseline
After a change you've decided is the new "good" (e.g. you switched models and accept the new cost):

```bash
EVAL_RUNNER=sdk npm run baseline      # writes the current run into baseline.json
```

## See the gate fail (it's not always-green)

In `runner.ts`, the `MOCK_OUTPUTS` block has a hint: flip a quote's `amount` to `"2m"` (a string)
or lowercase a `currency`. Re-run `npm run eval` — that quote fails first-pass validation, the rate
drops below 98%, the comparison flags a regression, and you get `FAIL ✗` with exit 1, e.g.:

```
↳ quote[1] invalid → currency: ISO-4217 3-letter code; amount: Expected number, received string
```

## Adapting this to another metric

1. Copy this folder.
2. Point `runner.ts` at the agent you're testing (and parse its output shape).
3. Swap `scorer.ts` for that metric's scoring logic (import it from the matching `../<id>.eval.ts`).
4. Curate `dataset.ts` and record a fresh `baseline.json`.

# Eval & Observability — test scripts

One runnable TypeScript script per metric (41 total). Each script:

- Loads **healthy fixtures** (so it `PASS`es out of the box).
- Computes the metric in a pure `evaluate()` function returning `{ pass, detail }`.
- Prints `[<metric-id>] <detail>` then `PASS ✓` / `FAIL ✗`.
- Exits `0` on pass, `1` on fail — so they double as **CI gates**.

Each card in [`../agent-assessment.html`](../agent-assessment.html) links to its script via **"View test script ↗"**. The filename equals the metric id (e.g. `tool-trajectory` → `tool-trajectory.eval.ts`).

## Prerequisites

- Node.js 20+ (`node -v`)
- [`tsx`](https://github.com/privatenumber/tsx) — no install needed, run via `npx tsx`.

## Run one

```bash
npx tsx tool-trajectory.eval.ts
```

## Run all

```bash
# from this scripts/ directory
for f in *.eval.ts; do
  echo "── $f";
  npx tsx "$f" || echo "   ^ FAILED";
done
```

PowerShell (Windows):

```powershell
Get-ChildItem *.eval.ts | ForEach-Object {
  Write-Host "── $($_.Name)"
  npx tsx $_.FullName
  if ($LASTEXITCODE -ne 0) { Write-Host "   ^ FAILED" }
}
```

## Run a metric *against the live agent* (and compare)

The 41 scripts above score **fixtures** (so they're self-contained and always demonstrate the metric).
To run a metric against the **real agent** and compare outcomes vs a baseline, see the worked
end-to-end example in [`live/`](live/) — it wires **schema-conformance → the `proposal-pricing`
agent** via the Claude Agent SDK:

```
dataset → runner (the agent) → scorer (the metric) → compare vs baseline.json → PASS/FAIL
```

```bash
cd live
npm install
npm run eval                 # offline (mock runner) — see the whole flow with no API key
EVAL_RUNNER=sdk npm run eval # live agent (needs ANTHROPIC_API_KEY)
```

It prints per-deal results, the aggregate valid-rate/cost/latency, and the **delta vs baseline**,
failing (exit 1) on a threshold miss or regression. See [`live/README.md`](live/README.md) for the
full walkthrough and how to adapt it to the other 40 metrics.

## Make one FAIL (to see the gate work)

Every script has a comment near the fixtures telling you which value to flip
(e.g. *"add a 9000 to break p95"*, *"set recovered:false to break it"*).
Change it, re-run, and the script prints `FAIL ✗` and exits `1`.

## Metrics by category

| Category | Scripts |
|---|---|
| Output correctness | `regression-eval-set`, `llm-judge-rubric`, `citation-faithfulness`, `exact-vs-semantic-match`, `schema-conformance`, `calibration-ece`, `multi-turn-coherence`, `pairwise-preference` |
| Behavior & tool use | `tool-trajectory`, `tool-argument-validity`, `refusal-rate`, `safety-guardrail-adherence`, `tool-failure-recovery` |
| Cost & latency | `cost-per-task`, `latency-percentiles`, `token-usage-attribution`, `tail-latency-analysis` |
| Safety & robustness | `red-team-injection`, `jailbreak-resistance`, `pii-leakage`, `hallucination-rate` |
| Eval ops | `eval-set-freshness`, `ci-eval-gate`, `sample-size-power`, `prompt-ab-eval` |
| Traces (obs) | `obs-trace-tree`, `obs-spans`, `obs-events`, `obs-replay` |
| Metrics (obs) | `obs-counters`, `obs-histograms`, `obs-five-metrics`, `obs-per-agent` |
| Dashboards & alerts (obs) | `obs-dashboards`, `obs-alert-thresholds`, `obs-alert-fatigue`, `obs-oncall-playbook` |
| Trace sampling (obs) | `obs-sample-failures`, `obs-sample-routine`, `obs-sample-rare`, `obs-sample-anomalous-cost` |

These map to the agent system in [`../agent-assessment.html`](../agent-assessment.html)
(Meridian Commercial Bank "Apex" desk — orchestrator + 6 subagents).

# Module 8 — Evaluation & Observability

> **Module length:** ~8 hours · **Lessons:** 4 · **Prereqs:** Modules 2 (calibration), 4 (Sherpa eval gate), 5 (RAG faithfulness).

## Learning objectives

1. **Design** an eval harness tailored to an agent's task (not borrowed from a generic benchmark).
2. **Use** LLM-as-judge correctly, including bias correction.
3. **Instrument** traces for diagnostic observability.
4. **Run** regression evals on every prompt/model change.

## Module mind map

![Module mind map](diagrams/m08/01-module-mindmap.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Eval))
    Benchmarks
      SWE-bench
      GAIA
      WebArena
      Custom
    LLM-as-judge
      Pairwise
      Rubrics
      Bias
    Observability
      Traces
      Spans
      Metrics
    Regression
      Locked set
      Adversarial
      Drift
```

</details>

## Module DAG

![Module DAG](diagrams/m08/02-module-dag.svg)

<details><summary>Mermaid source</summary>

```mermaid
graph LR
  L81[8.1 Eval Design]:::current --> L82[8.2 LLM-as-Judge]
  L81 --> L83[8.3 Observability]
  L82 --> L84[8.4 Regression]
  L83 --> L84
  classDef current fill:#fc6,stroke:#a60,stroke-width:3px
```

</details>

---

# Lesson 8.1 — Designing an Eval Harness

> **§0 · From last time.** Sherpa v5 has an eval gate (Lesson 4.5). That gate needs an eval *set* designed for HSBC's actual task — not borrowed from a paper.

## §1 · Business scenario

Daniel: *"I want to know Sherpa's accuracy. What number do I quote? The number my eval shows depends entirely on which cases I picked."*

## §2 · Bridge

Eval design is the act of choosing the cases that will define "good." Get it wrong and your numbers are misleading; get it right and the numbers drive decisions.

## §3 · Mind map

![Mind map](diagrams/m08/03-eval-design.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Eval Design))
    Set composition
      Real cases
      Adversarial
      Edge cases
      Distribution match
    Metrics
      Accuracy
      Calibration
      Cost
      Latency
    Coverage
      Per-category
      Per-counterparty
      Per-time
```

</details>

## §4 · Elaboration

### 4.1 Set composition

Three sub-sets:
1. **Regression set** (100–500 cases): historical, ground-truth labelled, frozen. Catches *regressions* on known-good behaviour.
2. **Adversarial set** (50–200 cases): edge cases designed to stress the system. Synthetically generated or carefully selected.
3. **Live shadow** (rolling): production traffic with delayed ground truth (from human review). Catches distribution drift.

### 4.2 Metrics

Beyond accuracy:
- **Calibration** — when the agent says 80% confident, is it right 80% of the time?
- **Cost per task** — dollars per invocation, averaged across the set.
- **Latency p50/p95/p99** — agent latency distribution.
- **Tool-call efficiency** — bits of information per dollar (Lesson 2.4).
- **Citation faithfulness** — for RAG, fraction of cited claims actually supported.

### 4.3 Coverage

Stratify the regression set by relevant dimensions:
- Break category (5 buckets)
- Counterparty (top-20 + long tail)
- Amount range (3 buckets)
- Time of day

Report accuracy per-stratum to catch hidden weaknesses.

### 4.4 The size question

How many cases? Roughly:
- 50 cases: detect 10pp accuracy differences
- 200 cases: detect 5pp differences
- 1000 cases: detect 2pp differences

Pick the smallest set that gives you enough signal for the decisions you'll make. More cases = more eval cost.

## §5 · Problem

Design Sherpa's regression eval. Specify: size, composition, stratification, metrics.

## §6 · Solution

200 cases stratified across category × counterparty × amount range. Reported metrics: accuracy, calibration, cost, p95 latency, citation faithfulness. Refreshed quarterly (add new cases, retire old, keep distribution match with production).

## §7 · Math

### 7.1 Binomial confidence intervals

For accuracy $\hat{p}$ on $N$ trials:
$$
\text{CI}_{95} \approx \hat{p} \pm 1.96 \sqrt{\hat{p}(1-\hat{p})/N}
$$

For 200 trials, 90% accuracy: CI is ±4pp. Anything within that is noise.

### 7.2 Calibration measurement

Bin predictions by stated confidence (deciles). For each bin, compute actual accuracy. Plot. Should fall on $y = x$. Deviations measure miscalibration (ECE — Expected Calibration Error).

## §8 · Tech deep-dive

### 8.1 Ground truth maintenance

Ground truth labels drift (human errors, policy changes). Re-validate 10% of the regression set annually; replace stale labels.

### 8.2 The "frozen set" discipline

The regression set is *frozen*. Don't add cases that are particularly hard for the current version — that's gaming. Add cases that reflect production distribution.

### 8.3 Adversarial generation

For edge cases: have a separate LLM *generate* adversarial cases (different from the agent's model, with prompts like "generate a SWIFT break that would be ambiguous"). Human review for plausibility.

## §9 · Unlocks

- 8.2 covers how to judge open-ended outputs.
- 8.3 covers the trace instrumentation needed to debug failures.
- 8.4 covers running these evals on every change.

---

# Lesson 8.2 — LLM-as-Judge: Pairwise, Rubrics, Bias

> **§0 · From last time.** For classification tasks (Sherpa), ground truth is unambiguous. For open-ended tasks (Helix hypothesis generation), there's no ground truth — only judgment. LLM-as-judge automates that judgment.

## §1 · Business scenario

Maya asks: *"How do we know our hypothesis-generation agent is producing good hypotheses? Reviewing every one takes a week."*

## §2 · Bridge

LLM-as-judge is reliable *if* you control its known biases. Pairwise comparison + rubric + bias correction = production-grade eval for open-ended tasks.

## §3 · Mind map

![Mind map](diagrams/m08/04-llm-judge.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((LLM Judge))
    Modes
      Pairwise
      Scoring
      Rubric
    Biases
      Position
      Verbosity
      Self preference
    Calibration
      Human anchor
      Inter-rater
      Bias correction
```

</details>

## §4 · Elaboration

### 4.1 Pairwise beats absolute scoring

Asking the judge "rate this 1-10" produces noisy scores. Asking "which is better, A or B?" is more reliable. Compute win-rates over a tournament.

### 4.2 Rubrics

Even pairwise needs a rubric — explicit criteria the judge uses. For hypotheses:
- Novelty
- Plausibility (consistent with known biology)
- Testability (feasible experiment)
- Specificity (mechanism named)

Judge scores each criterion separately, then combines. More reliable than asking "which is better" with no rubric.

### 4.3 Biases and mitigations

- **Position bias**: judge prefers whichever option comes first. *Mitigation*: randomise position; run twice with positions swapped, average.
- **Verbosity bias**: judge prefers longer outputs. *Mitigation*: explicit rubric criterion penalising verbosity; or normalise by length.
- **Self-preference**: judge prefers outputs from its own model family. *Mitigation*: use a *different* model as judge than the system being evaluated.

### 4.4 Calibrating against human

Periodically: run a 100-case eval where humans also judge. Compute agreement (Cohen's κ or similar). If judge-human agreement < 0.6, recalibrate the rubric.

## §5 · Problem

Build an LLM-as-judge eval for Helix's hypothesis-generation agent.

## §6 · Solution

Opus judges Sonnet-generated hypotheses pairwise on a 4-dimension rubric. Position randomised. Calibration against Maya's manual reviews: κ = 0.74. Quarterly recalibration.

## §7 · Math

### 7.1 Bradley-Terry for win-rate aggregation

From pairwise outcomes, fit a Bradley-Terry model to estimate latent skill of each system. More reliable than naive win-rate when matchups are unequal.

### 7.2 Position bias correction

If judge picks "A" 55% when A is first and 45% when A is second: true preference is the average (50%). Correct any non-symmetric judge with explicit position swapping.

## §8 · Tech deep-dive

### 8.1 The "different model" rule

Judge model ≠ tested model. Anthropic judging Anthropic biases toward Anthropic. OpenAI judging Anthropic is more neutral.

### 8.2 Cost of LLM-as-judge

Each pair comparison = one LLM call. For 100 hypotheses × 4 rubric items × 2 position swaps = 800 calls. At $0.05/call: $40 per full eval. Worth it for the time saved.

### 8.3 When to skip LLM-as-judge

If you have programmatically-checkable correctness (math, code), use that. LLM-as-judge is for the cases where you genuinely need judgment.

## §9 · Unlocks

- 8.3 covers the trace data needed for both metrics and debugging.

---

# Lesson 8.3 — Observability: Traces, Spans, Metrics

> **§0 · From last time.** Evals give aggregate quality. Observability gives per-task introspection — why *this* invocation failed.

## §1 · Business scenario

Sherpa misclassified case BR-208441. Daniel asks: *"What did it do? Show me everything."*

## §2 · Bridge

Without trace instrumentation, you'll spend hours guessing. With it, you replay the agent's mind in 30 seconds.

## §3 · Mind map

![Mind map](diagrams/m08/05-observability.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Observability))
    Traces
      Per-task tree
      Spans
      Events
    Metrics
      Counters
      Histograms
      Per-agent
    Dashboards
      Cost
      Accuracy
      Calibration
    Sampling
      Always for failures
      1 percent for successes
```

</details>

## §4 · Elaboration

### 4.1 Trace structure

Each task = one trace. Trace = tree of spans. Each span = one operation (LLM call, tool invocation, memory read, etc.).

```
trace_id: BR-208441
spans:
  - agent.classify (8.3s)
    - llm.call (1.2s) — model picks first tool
    - tool.query_GL (0.4s)
    - llm.call (1.1s) — model interprets result
    - tool.query_counterparty (0.6s)
    - llm.call (1.0s) — model commits
```

OpenTelemetry-compatible. Stored in Honeycomb, Datadog, or self-hosted.

### 4.2 Metrics

Per agent, per tool, per task type:
- Counters: invocations, successes, failures, per error type
- Histograms: latency, cost, tool-call count, confidence

Dashboard primary metrics:
- Accuracy (rolling 7-day on shadow set)
- Cost per task (rolling daily)
- p95 latency (rolling hourly)
- Calibration (rolling weekly)

### 4.3 Sampling

Trace storage costs money. Sample:
- Always: failures, escalations, high-confidence wrong answers.
- 100%: rare task types (low volume, high importance).
- 1%: routine successful tasks (statistical sample).

### 4.4 Debugging workflow

1. Alert fires (accuracy drop, cost spike).
2. Filter traces to the relevant window.
3. Look at failure traces. Find the failing span.
4. Replay locally with same inputs.
5. Fix, deploy via the eval gate.

This is what makes agents debuggable. Without it, you're guessing.

## §5 · Problem

Instrument Sherpa with OTel. Build the 4 dashboard widgets above. Define alert thresholds.

## §6 · Solution

`lab-8.3/` ships instrumented Sherpa + Grafana dashboards + alert config. Default thresholds: accuracy < 88% (7d), cost > $0.08/task (24h), p95 > 15s (1h), calibration ECE > 0.05 (7d).

## §7 · Math

### 7.1 Alert threshold setting

Use historical data: pick thresholds such that false-positive alert rate < 1/month. Otherwise the team starts ignoring alerts.

### 7.2 Sampling math

For 1% sample of routine traces: at 1,400/night, that's 14 stored/night. After 30 days: ~420 traces. Sufficient for distribution analysis.

## §8 · Tech deep-dive

### 8.1 What to log

Everything in the LLM message exchange (prompts, completions). Everything in tool calls (args, returns). Latency per span. Cost per LLM call. Memory hits.

### 8.2 What NOT to log

PII unless authorised. Encrypt traces containing customer data. Apply 7-year retention for audit; shorter for the rest.

### 8.3 Replay infrastructure

Build a "replay" mode: take a stored trace, re-run with the same inputs but new prompt/model. Compare outputs. This is how you A/B prompt changes without re-running on real traffic.

## §9 · Unlocks

- 8.4 ties evals + observability into continuous regression.

---

# Lesson 8.4 — Regression Evals on Every Change

> **§0 · From last time.** We have evals (8.1), judgment (8.2), and observability (8.3). Now we need to *run* the eval on every change automatically.

## §1 · Business scenario

A model release candidate (Sonnet 4.7 ships next month). Daniel: *"Will Sherpa still work? Or will accuracy silently regress?"*

## §2 · Bridge

A regression eval, run in CI, blocks changes that hurt metrics. Same discipline as unit tests.

## §3 · Mind map

![Mind map](diagrams/m08/06-regression-eval.svg)

<details><summary>Mermaid source</summary>

```mermaid
mindmap
  root((Regression))
    Triggers
      PR merge
      Model upgrade
      Prompt change
      Tool change
    Gates
      Accuracy floor
      Cost ceiling
      Latency ceiling
    Reporting
      Per metric
      Per slice
      Diff vs baseline
```

</details>

## §4 · Elaboration

### 4.1 What triggers a regression run

- Any change to prompts (file change)
- Any change to model version (config change)
- Any change to tool registry (schema change)
- Weekly cron (catch upstream model drift)

### 4.2 The gate

```
Accept iff:
  accuracy_new >= accuracy_baseline - 1pp
  AND cost_new <= cost_baseline * 1.10
  AND p95_latency_new <= p95_latency_baseline * 1.15
  AND no high-confidence wrong answers introduced
```

Strict enough to block real regressions, loose enough to allow legitimate trade-offs.

### 4.3 Per-slice reporting

Report not just aggregate metrics but per-slice:
- Per break category
- Per counterparty tier
- Per time of day

A change might raise aggregate accuracy while *dropping* one slice. Per-slice catches it.

### 4.4 The diff format

For each metric: baseline value, new value, delta, per-slice deltas, sample size. Reviewers see at a glance whether the change is safe.

## §5 · Problem

Build the regression CI pipeline. Includes: trigger, eval run, gate logic, report format, alerting on failure.

## §6 · Solution

GitHub Actions workflow runs eval on every PR. Posts comment with the diff. Fails CI on gate breach. Slack alert on cron failures. `lab-8.4/` ships the working pipeline.

## §7 · Math

### 7.1 The eval-as-test analogy

Software unit tests catch *behavioural* regressions. Agent evals catch *statistical* regressions. Same role; different math.

### 7.2 Eval set staleness

If you run the same eval daily for a year, agents may overfit (via prompt iteration). Refresh 20% of the set quarterly to keep honest signal.

## §8 · Tech deep-dive

### 8.1 Caching eval results

LLM calls are deterministic with seeded sampling (where supported). Cache by (model, prompt, input) hash. Eval CI runs in minutes instead of hours.

### 8.2 The "shadow eval"

Run new versions against production traffic in shadow mode (not user-visible). Compare to live version. Catches issues the regression set misses.

### 8.3 Cost of evals

For Sherpa: 200-case eval × $0.05/case = $10/run. Runs ~50× per quarter = $500/quarter. Cheap.

## §9 · Unlocks

- Module 9 deep-dives on production engineering, including eval as part of deployment.

---

# Module 8 — Summary & exit criteria

- [ ] Design a stratified, frozen regression set for your task.
- [ ] Use LLM-as-judge with position randomisation and rubrics.
- [ ] Instrument traces with OTel and build alert dashboards.
- [ ] Run regression evals on every change in CI.

---

*End of Module 8.*

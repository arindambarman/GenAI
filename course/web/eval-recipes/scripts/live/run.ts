/**
 * Harness — run the schema-conformance metric against the proposal-pricing agent and COMPARE.
 *
 *   dataset → runner (agent) → scorer → aggregate → compare vs baseline.json → PASS/FAIL
 *
 * Usage:
 *   npx tsx run.ts                       # offline (mock runner), compares to baseline.json
 *   EVAL_RUNNER=sdk npx tsx run.ts       # live agent via Claude Agent SDK (needs ANTHROPIC_API_KEY)
 *   npx tsx run.ts --update-baseline     # record the current run as the new baseline
 *
 * Exit code 0 = gate passed, 1 = failed (CI-ready).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DATASET } from "./dataset";
import { getRunner } from "./runner";
import { scoreQuotes, THRESHOLD } from "./scorer";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HERE, "baseline.json");
const UPDATE = process.argv.includes("--update-baseline");
const TOLERANCE = 0.005; // 0.5pp drop allowed before we call it a regression

type Summary = {
  runner: string; dataset: number; totalQuotes: number; totalValid: number;
  rate: number; meanCostUsd: number; meanMs: number;
};

async function main() {
  const runner = getRunner();
  console.log(`▶ schema-conformance · target=proposal-pricing · runner=${runner.name}\n`);

  let totalQuotes = 0, totalValid = 0, totalCost = 0, totalMs = 0, runErrors = 0;

  for (const input of DATASET) {
    const res = await runner.run(input);
    if (!res.ok) runErrors++;
    const s = scoreQuotes(res.quotes);
    totalQuotes += s.total; totalValid += s.valid;
    totalCost += res.costUsd; totalMs += res.durationMs;

    const flag = s.total > 0 && s.rate >= THRESHOLD ? "✓" : "✗";
    console.log(
      `  ${flag} ${input.id.padEnd(18)} ${s.valid}/${s.total} valid ` +
      `(${(s.rate * 100).toFixed(1)}%)  $${res.costUsd.toFixed(4)}  ${res.durationMs}ms` +
      (res.ok ? "" : `  [run error: ${res.error}]`)
    );
    for (const f of s.failures) console.log(`       ↳ quote[${f.index}] invalid → ${f.issues}`);
  }

  const rate = totalQuotes ? totalValid / totalQuotes : 0;
  const summary: Summary = {
    runner: runner.name, dataset: DATASET.length, totalQuotes, totalValid,
    rate, meanCostUsd: totalCost / DATASET.length, meanMs: Math.round(totalMs / DATASET.length),
  };

  console.log(`\n── Outcome ──`);
  console.log(`  first-pass valid rate : ${(rate * 100).toFixed(2)}%   (threshold ${(THRESHOLD * 100).toFixed(0)}%)`);
  console.log(`  mean cost / deal      : $${summary.meanCostUsd.toFixed(4)}`);
  console.log(`  mean latency / deal   : ${summary.meanMs}ms`);
  if (runErrors) console.log(`  agent run errors      : ${runErrors}/${DATASET.length}`);

  if (UPDATE) {
    writeFileSync(BASELINE, JSON.stringify(summary, null, 2) + "\n");
    console.log(`\n✎ baseline updated → baseline.json`);
  }

  // ── compare ──
  let regression = false;
  if (existsSync(BASELINE) && !UPDATE) {
    const base: Summary = JSON.parse(readFileSync(BASELINE, "utf8"));
    const dRate = rate - base.rate;
    const dCost = summary.meanCostUsd - base.meanCostUsd;
    const dMs = summary.meanMs - base.meanMs;
    const sign = (n: number, p = 2) => (n >= 0 ? "+" : "") + n.toFixed(p);
    console.log(`\n── Compare vs baseline (runner=${base.runner}) ──`);
    console.log(`  valid rate : ${(base.rate * 100).toFixed(2)}%  →  ${(rate * 100).toFixed(2)}%   (${sign(dRate * 100)}pp)`);
    console.log(`  cost/deal  : $${base.meanCostUsd.toFixed(4)}  →  $${summary.meanCostUsd.toFixed(4)}   (${sign(dCost, 4)})`);
    console.log(`  latency    : ${base.meanMs}ms  →  ${summary.meanMs}ms   (${sign(dMs, 0)}ms)`);
    if (dRate < -TOLERANCE) {
      regression = true;
      console.log(`  ⚠ REGRESSION: valid rate fell ${(Math.abs(dRate) * 100).toFixed(2)}pp (> ${(TOLERANCE * 100).toFixed(1)}pp tolerance)`);
    }
  } else if (!existsSync(BASELINE)) {
    console.log(`\n(no baseline.json yet — run with --update-baseline to record one)`);
  }

  const pass = rate >= THRESHOLD && !regression && runErrors === 0;
  console.log(`\n${pass ? "PASS ✓" : "FAIL ✗"}  — gate: rate ≥ ${(THRESHOLD * 100).toFixed(0)}% AND no regression AND all agent runs ok`);
  process.exit(pass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });

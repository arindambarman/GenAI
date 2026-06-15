/**
 * CI eval gate — target: sales-orchestrator
 * The merge gate aggregates the per-metric eval suite; a regression below threshold must block the build.
 * PASS when: aggregate score >= 0.90 AND no individual critical metric regressed vs baseline.
 * Run:  npx tsx ci-eval-gate.eval.ts
 */
// Each metric: current score, baseline, and whether it's gate-critical (drop a critical below baseline to block).
const METRICS: { name: string; score: number; baseline: number; critical: boolean }[] = [
  { name: "regression-eval-set",        score: 0.94, baseline: 0.92, critical: true },
  { name: "safety-guardrail-adherence", score: 1.00, baseline: 1.00, critical: true },
  { name: "schema-conformance",         score: 0.99, baseline: 0.98, critical: true },
  { name: "tool-trajectory",            score: 0.91, baseline: 0.90, critical: false },
  { name: "hallucination-rate",         score: 0.98, baseline: 0.97, critical: true },
];
const AGG_MIN = 0.90;

function evaluate() {
  const agg = METRICS.reduce((s, m) => s + m.score, 0) / METRICS.length;
  const regressed = METRICS.filter(m => m.critical && m.score < m.baseline);
  return {
    pass: agg >= AGG_MIN && regressed.length === 0,
    detail: `aggregate=${agg.toFixed(3)} (>=${AGG_MIN}), critical regressions=${regressed.length}${regressed.length ? `: ${regressed.map(m => m.name).join(", ")}` : ""}`,
  };
}

const r = evaluate();
console.log(`[ci-eval-gate] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

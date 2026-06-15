/**
 * Anomalous-cost sampling — target: proposal-pricing
 * Traces whose token-cost is a statistical outlier must be force-sampled for review —
 * runaway loops and prompt bloat hide in the cost tail.
 * PASS when: every trace beyond mean + 2σ is captured (capture rate == 100%).
 * Run:  npx tsx obs-sample-anomalous-cost.eval.ts
 */
// Per-trace cost ($) and whether sampled (set a high-cost trace's sampled=false to break it).
const TRACES: { id: string; cost: number; sampled: boolean }[] = [
  { id: "t1", cost: 0.30, sampled: false },
  { id: "t2", cost: 0.34, sampled: false },
  { id: "t3", cost: 0.28, sampled: true },
  { id: "t4", cost: 0.41, sampled: false },
  { id: "t5", cost: 1.95, sampled: true },   // runaway loop — must be captured
  { id: "t6", cost: 0.33, sampled: false },
];

function evaluate() {
  const costs = TRACES.map(t => t.cost);
  const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
  const sd = Math.sqrt(costs.reduce((a, b) => a + (b - mean) ** 2, 0) / costs.length);
  const threshold = mean + 2 * sd;
  const anomalies = TRACES.filter(t => t.cost > threshold);
  const captured = anomalies.filter(t => t.sampled);
  const rate = anomalies.length ? captured.length / anomalies.length : 1;
  return { pass: rate === 1, detail: `threshold=$${threshold.toFixed(2)} (μ+2σ); ${captured.length}/${anomalies.length} anomalies captured = ${(rate * 100).toFixed(0)}%` };
}

const r = evaluate();
console.log(`[obs-sample-anomalous-cost] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

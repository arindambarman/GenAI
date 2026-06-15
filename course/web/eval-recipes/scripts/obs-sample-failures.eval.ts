/**
 * Sample-all-failures — target: compliance-risk-reviewer
 * Sampling policy must capture 100% of failed/error traces (you can downsample successes, never failures).
 * PASS when: failure capture rate == 100%.
 * Run:  npx tsx obs-sample-failures.eval.ts
 */
// Traces with outcome and whether the sampler retained them (drop a failed trace to break it).
const TRACES: { id: string; outcome: "ok" | "error"; sampled: boolean }[] = [
  { id: "t1", outcome: "ok",    sampled: false },  // ok can be dropped
  { id: "t2", outcome: "error", sampled: true },
  { id: "t3", outcome: "ok",    sampled: true },
  { id: "t4", outcome: "error", sampled: true },
  { id: "t5", outcome: "error", sampled: true },
];

function evaluate() {
  const failures = TRACES.filter(t => t.outcome === "error");
  const captured = failures.filter(t => t.sampled);
  const rate = failures.length ? captured.length / failures.length : 1;
  return { pass: rate === 1, detail: `${captured.length}/${failures.length} failure traces captured = ${(rate * 100).toFixed(0)}%` };
}

const r = evaluate();
console.log(`[obs-sample-failures] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

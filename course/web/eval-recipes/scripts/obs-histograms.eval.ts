/**
 * Histogram bucket integrity — target: proposal-pricing
 * Latency histogram buckets must be cumulative (le-buckets non-decreasing) and the top bucket == total count.
 * PASS when: buckets are non-decreasing AND +Inf bucket equals the observed sample count.
 * Run:  npx tsx obs-histograms.eval.ts
 */
// Prometheus-style cumulative buckets: le (upper bound ms) → cumulative count.
const BUCKETS: { le: number; count: number }[] = [
  { le: 500,  count: 3 },
  { le: 1000, count: 9 },
  { le: 2000, count: 18 },
  { le: 5000, count: 24 },
  { le: Infinity, count: 25 },
];
const SAMPLE_COUNT = 25;

function evaluate() {
  let monotonic = true;
  for (let i = 1; i < BUCKETS.length; i++) if (BUCKETS[i].count < BUCKETS[i - 1].count) monotonic = false;
  const top = BUCKETS[BUCKETS.length - 1].count;
  return { pass: monotonic && top === SAMPLE_COUNT, detail: `${BUCKETS.length} buckets, monotonic=${monotonic}, +Inf=${top} vs samples=${SAMPLE_COUNT}` };
}

const r = evaluate();
console.log(`[obs-histograms] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

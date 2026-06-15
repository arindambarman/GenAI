/**
 * Tail latency analysis — target: proposal-pricing
 * The slow tail (p99) must not blow out relative to the median — a tight tail ratio means predictable UX.
 * PASS when: p99 <= 8000ms AND p99/p50 ratio <= 5.0.
 * Run:  npx tsx tail-latency-analysis.eval.ts
 */
// Latencies (ms); inject a 20000 outlier to blow out the tail ratio.
const LATENCIES = [900, 1000, 1100, 1200, 1300, 1500, 1700, 2000, 2400, 3000, 3800, 5200, 6800];
const LIMIT = { p99: 8000, ratio: 5.0 };

function pct(sorted: number[], p: number) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function evaluate() {
  const s = [...LATENCIES].sort((a, b) => a - b);
  const p50 = pct(s, 50), p99 = pct(s, 99);
  const ratio = p99 / p50;
  return { pass: p99 <= LIMIT.p99 && ratio <= LIMIT.ratio, detail: `p50=${p50}ms, p99=${p99}ms, tail ratio=${ratio.toFixed(2)} (<=${LIMIT.ratio}, p99<=${LIMIT.p99})` };
}

const r = evaluate();
console.log(`[tail-latency-analysis] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

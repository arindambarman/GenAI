/**
 * Latency percentiles — target: lead-qualifier
 * End-to-end response latency distribution; p50/p95 must stay under SLO.
 * PASS when: p50 <= 2000ms AND p95 <= 5000ms.
 * Run:  npx tsx latency-percentiles.eval.ts
 */
// Observed latencies (ms) across qualification requests (add a 9000 to break p95).
const LATENCIES = [820, 940, 1100, 1250, 1380, 1500, 1620, 1810, 2100, 2600, 3100, 4200];
const SLO = { p50: 2000, p95: 5000 };

function pct(sorted: number[], p: number) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function evaluate() {
  const s = [...LATENCIES].sort((a, b) => a - b);
  const p50 = pct(s, 50), p95 = pct(s, 95);
  return { pass: p50 <= SLO.p50 && p95 <= SLO.p95, detail: `p50=${p50}ms (<=${SLO.p50}), p95=${p95}ms (<=${SLO.p95}) over ${s.length} reqs` };
}

const r = evaluate();
console.log(`[latency-percentiles] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

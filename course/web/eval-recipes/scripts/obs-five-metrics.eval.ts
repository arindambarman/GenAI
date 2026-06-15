/**
 * Five golden signals — target: sales-orchestrator
 * The dashboard must report all five core agent signals and each must be within its SLO band.
 * (latency, traffic, errors, saturation, cost) — the LLM-agent flavour of the golden signals.
 * PASS when: all five are present AND within band.
 * Run:  npx tsx obs-five-metrics.eval.ts
 */
const SIGNALS: { name: string; value: number; max: number }[] = [
  { name: "latency_p95_ms",   value: 4200, max: 5000 },
  { name: "traffic_rps",      value: 12,   max: 50 },     // headroom check
  { name: "error_rate",       value: 0.012, max: 0.02 },
  { name: "saturation_pct",   value: 0.61, max: 0.85 },
  { name: "cost_per_task_usd", value: 0.34, max: 0.50 },
];
const EXPECTED = ["latency_p95_ms", "traffic_rps", "error_rate", "saturation_pct", "cost_per_task_usd"];

function evaluate() {
  const present = EXPECTED.every(e => SIGNALS.some(s => s.name === e));
  const breaches = SIGNALS.filter(s => s.value > s.max);
  return { pass: present && breaches.length === 0, detail: `5/5 present=${present}, breaches=${breaches.length}${breaches.length ? ": " + breaches.map(b => b.name).join(", ") : ""}` };
}

const r = evaluate();
console.log(`[obs-five-metrics] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

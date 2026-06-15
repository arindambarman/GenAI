/**
 * Alert threshold correctness — target: compliance-risk-reviewer
 * Each critical metric must have an alert rule whose threshold sits inside a sane band
 * (not so tight it always fires, not so loose it never does).
 * PASS when: every critical metric has a rule AND each threshold is within its sane band.
 * Run:  npx tsx obs-alert-thresholds.eval.ts
 */
// metric → {threshold, [minSane, maxSane]} (push a threshold outside its band to break it).
const RULES: Record<string, { threshold: number; band: [number, number] }> = {
  error_rate:        { threshold: 0.02, band: [0.005, 0.05] },
  latency_p95_ms:    { threshold: 5000, band: [3000, 8000] },
  cost_per_task_usd: { threshold: 0.50, band: [0.30, 1.00] },
  refusal_miss_rate: { threshold: 0.00, band: [0.00, 0.02] },
};
const CRITICAL = ["error_rate", "latency_p95_ms", "cost_per_task_usd", "refusal_miss_rate"];

function evaluate() {
  const problems: string[] = [];
  for (const m of CRITICAL) {
    const r = RULES[m];
    if (!r) { problems.push(`no rule: ${m}`); continue; }
    if (r.threshold < r.band[0] || r.threshold > r.band[1]) problems.push(`${m} threshold ${r.threshold} outside [${r.band[0]}, ${r.band[1]}]`);
  }
  return { pass: problems.length === 0, detail: `${CRITICAL.length} critical metrics; ${problems.length} problem(s)${problems.length ? ": " + problems.join("; ") : ""}` };
}

const r = evaluate();
console.log(`[obs-alert-thresholds] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

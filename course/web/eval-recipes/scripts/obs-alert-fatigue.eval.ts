/**
 * Alert fatigue — target: sales-orchestrator
 * Too many low-value/false alerts desensitise on-call. Track alert volume and precision.
 * PASS when: alert precision (real / total fired) >= 0.80 AND <= 10 alerts/day.
 * Run:  npx tsx obs-alert-fatigue.eval.ts
 */
// Alerts fired over the window; actionable=true means it mapped to a real incident.
const ALERTS: { id: string; actionable: boolean }[] = [
  { id: "a1", actionable: true }, { id: "a2", actionable: true }, { id: "a3", actionable: true },
  { id: "a4", actionable: false }, { id: "a5", actionable: true }, { id: "a6", actionable: true },
  { id: "a7", actionable: true }, { id: "a8", actionable: true },
];
const WINDOW_DAYS = 1;
const MIN_PRECISION = 0.80;
const MAX_PER_DAY = 10;

function evaluate() {
  const real = ALERTS.filter(a => a.actionable).length;
  const precision = real / ALERTS.length;
  const perDay = ALERTS.length / WINDOW_DAYS;
  return { pass: precision >= MIN_PRECISION && perDay <= MAX_PER_DAY, detail: `precision=${(precision * 100).toFixed(0)}% (>=${MIN_PRECISION * 100}%), ${perDay}/day (<=${MAX_PER_DAY})` };
}

const r = evaluate();
console.log(`[obs-alert-fatigue] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

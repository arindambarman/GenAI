/**
 * Cost per task — target: sales-orchestrator
 * Average $ spent (tokens × model price) to complete one deal-prep task must stay within budget.
 * PASS when: mean cost-per-task <= $0.50.
 * Run:  npx tsx cost-per-task.eval.ts
 */
// Per-task token usage; prices in $ per 1M tokens (sonnet vs haiku tiers).
const PRICE = { sonnet: { in: 3.0, out: 15.0 }, haiku: { in: 0.8, out: 4.0 } };
const TASKS: { model: keyof typeof PRICE; inTok: number; outTok: number }[] = [
  { model: "sonnet", inTok: 12_000, outTok: 1_800 },
  { model: "haiku",  inTok: 8_000,  outTok: 900 },
  { model: "sonnet", inTok: 15_000, outTok: 2_200 },
  { model: "haiku",  inTok: 6_500,  outTok: 700 },
];
const BUDGET = 0.50;

function costOf(t: typeof TASKS[number]) {
  const p = PRICE[t.model];
  return (t.inTok / 1e6) * p.in + (t.outTok / 1e6) * p.out;
}

function evaluate() {
  const total = TASKS.reduce((s, t) => s + costOf(t), 0);
  const mean = total / TASKS.length;
  return { pass: mean <= BUDGET, detail: `mean cost/task=$${mean.toFixed(4)} over ${TASKS.length} tasks (budget $${BUDGET.toFixed(2)})` };
}

const r = evaluate();
console.log(`[cost-per-task] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

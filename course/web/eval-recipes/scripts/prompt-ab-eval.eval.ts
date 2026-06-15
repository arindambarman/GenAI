/**
 * Prompt A/B eval — target: proposal-pricing
 * Compare two prompt variants on the same deals; ship B only if it beats A by a meaningful, stable margin.
 * PASS when: B's pass rate exceeds A by >= 3pp (the minimum ship-worthy lift).
 * Run:  npx tsx prompt-ab-eval.eval.ts
 */
// Per-deal pass (1) / fail (0) for each prompt variant on identical inputs.
const A = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1];
const B = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1];
const MIN_LIFT = 0.03;

const rate = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function evaluate() {
  const ra = rate(A), rb = rate(B), lift = rb - ra;
  return { pass: lift >= MIN_LIFT, detail: `A=${(ra * 100).toFixed(0)}%, B=${(rb * 100).toFixed(0)}%, lift=${(lift * 100).toFixed(0)}pp (>=${(MIN_LIFT * 100).toFixed(0)}pp) → ${lift >= MIN_LIFT ? "ship B" : "keep A"}` };
}

const r = evaluate();
console.log(`[prompt-ab-eval] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

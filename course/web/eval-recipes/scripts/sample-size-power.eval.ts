/**
 * Sample size / power — target: lead-qualifier
 * Before trusting an eval delta, the sample must be large enough to detect the target effect.
 * PASS when: actual n >= required n for the chosen effect size, alpha=0.05, power=0.80.
 * Run:  npx tsx sample-size-power.eval.ts
 */
// Two-proportion approximation: n per group ≈ 16 * p(1-p) / effect² (rule-of-thumb for alpha .05, power .80).
const BASELINE_P = 0.85;     // baseline pass rate
const MIN_EFFECT = 0.05;     // smallest improvement we care to detect
const ACTUAL_N = 1000;       // cases per arm we actually have (drop to 400 to fail the gate)

function requiredN(p: number, effect: number) {
  return Math.ceil((16 * p * (1 - p)) / (effect * effect));
}

function evaluate() {
  const need = requiredN(BASELINE_P, MIN_EFFECT);
  return { pass: ACTUAL_N >= need, detail: `need ~${need}/arm to detect ${(MIN_EFFECT * 100).toFixed(0)}pp at α=.05 power=.80; have ${ACTUAL_N}` };
}

const r = evaluate();
console.log(`[sample-size-power] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

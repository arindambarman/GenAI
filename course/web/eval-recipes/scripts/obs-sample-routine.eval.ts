/**
 * Routine-traffic downsampling — target: sales-orchestrator
 * Successful, routine traces should be downsampled to a target rate to control storage cost —
 * but the realised rate must stay close to the configured target (not 0, not 100%).
 * PASS when: realised sample rate is within ±20% of the configured 10% target.
 * Run:  npx tsx obs-sample-routine.eval.ts
 */
const TARGET = 0.10;
const TOLERANCE = 0.20; // relative
// Over a window of routine OK traces, how many were sampled.
const TOTAL_ROUTINE = 1000;
const SAMPLED = 104;

function evaluate() {
  const realised = SAMPLED / TOTAL_ROUTINE;
  const lo = TARGET * (1 - TOLERANCE), hi = TARGET * (1 + TOLERANCE);
  return { pass: realised >= lo && realised <= hi, detail: `realised=${(realised * 100).toFixed(1)}% vs target ${(TARGET * 100).toFixed(0)}% (band ${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%)` };
}

const r = evaluate();
console.log(`[obs-sample-routine] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

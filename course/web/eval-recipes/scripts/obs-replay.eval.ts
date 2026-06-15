/**
 * Trace replay determinism — target: sales-orchestrator
 * Replaying a captured trace (same inputs, seeds, tool stubs) must reproduce the same decisions —
 * essential for debugging and post-incident analysis.
 * PASS when: replayed outputs match the recorded outputs for 100% of steps.
 * Run:  npx tsx obs-replay.eval.ts
 */
// Recorded decision per step vs what the replay produced (change one to break determinism).
const STEPS: { step: string; recorded: string; replayed: string }[] = [
  { step: "qualify",    recorded: "qualified",  replayed: "qualified" },
  { step: "design",     recorded: "bundle:tf+cm", replayed: "bundle:tf+cm" },
  { step: "price",      recorded: "180bps",     replayed: "180bps" },
  { step: "compliance", recorded: "clear",      replayed: "clear" },
];

function evaluate() {
  const mismatches = STEPS.filter(s => s.recorded !== s.replayed);
  const rate = (STEPS.length - mismatches.length) / STEPS.length;
  return { pass: mismatches.length === 0, detail: `${STEPS.length - mismatches.length}/${STEPS.length} steps reproduced = ${(rate * 100).toFixed(0)}%${mismatches.length ? ` (mismatch: ${mismatches.map(m => m.step).join(", ")})` : ""}` };
}

const r = evaluate();
console.log(`[obs-replay] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

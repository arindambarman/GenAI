/**
 * Rare-event oversampling — target: competitive-intelligence
 * Rare-but-important traces (new competitor mention, novel objection) must be oversampled so the
 * tail is observable — never lost in routine downsampling.
 * PASS when: every flagged rare event is retained (capture rate == 100%).
 * Run:  npx tsx obs-sample-rare.eval.ts
 */
// Traces flagged rare by a detector, and whether the sampler kept them (drop one to break it).
const TRACES: { id: string; rare: boolean; sampled: boolean }[] = [
  { id: "t1", rare: false, sampled: false },
  { id: "t2", rare: true,  sampled: true },   // new competitor named
  { id: "t3", rare: false, sampled: true },
  { id: "t4", rare: true,  sampled: true },   // novel objection pattern
  { id: "t5", rare: true,  sampled: true },
];

function evaluate() {
  const rare = TRACES.filter(t => t.rare);
  const kept = rare.filter(t => t.sampled);
  const rate = rare.length ? kept.length / rare.length : 1;
  return { pass: rate === 1, detail: `${kept.length}/${rare.length} rare events retained = ${(rate * 100).toFixed(0)}%` };
}

const r = evaluate();
console.log(`[obs-sample-rare] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

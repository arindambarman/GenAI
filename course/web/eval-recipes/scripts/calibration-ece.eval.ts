/**
 * Calibration / ECE — target: lead-qualifier · compliance-risk-reviewer
 * Expected Calibration Error: gap between stated confidence and actual accuracy.
 * PASS when: ECE <= 0.05.
 * Run:  npx tsx calibration-ece.eval.ts
 */
// (confidence, wasCorrect) pairs from labelled qualification/compliance decisions.
// Well-calibrated: stated confidence ≈ observed accuracy in each bin.
// Flip a `correct: true` → `false` to widen the gap and push ECE above 0.05.
const SAMPLES: { conf: number; correct: boolean }[] = [
  { conf: 0.84, correct: true }, { conf: 0.84, correct: true }, { conf: 0.83, correct: true },
  { conf: 0.83, correct: true }, { conf: 0.83, correct: true }, { conf: 0.83, correct: false },
  { conf: 0.75, correct: true }, { conf: 0.75, correct: true }, { conf: 0.75, correct: true },
  { conf: 0.75, correct: false },
];
const BINS = 5;

function evaluate() {
  const buckets = Array.from({ length: BINS }, () => ({ n: 0, conf: 0, correct: 0 }));
  for (const s of SAMPLES) {
    const i = Math.min(BINS - 1, Math.floor(s.conf * BINS));
    buckets[i].n++; buckets[i].conf += s.conf; buckets[i].correct += s.correct ? 1 : 0;
  }
  let ece = 0;
  for (const b of buckets) if (b.n) ece += (b.n / SAMPLES.length) * Math.abs(b.correct / b.n - b.conf / b.n);
  return { pass: ece <= 0.05, detail: `ECE=${ece.toFixed(3)} over ${SAMPLES.length} samples, ${BINS} bins` };
}

const r = evaluate();
console.log(`[calibration-ece] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

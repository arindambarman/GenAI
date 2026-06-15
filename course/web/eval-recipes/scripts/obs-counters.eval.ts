/**
 * Counter monotonicity — target: sales-orchestrator
 * Cumulative counters (requests, errors, refusals) must be non-decreasing across scrapes —
 * a drop means a lost reset or double-count bug.
 * PASS when: every counter series is monotonically non-decreasing.
 * Run:  npx tsx obs-counters.eval.ts
 */
// Successive scrapes of each counter (insert a decrease to break it).
const SERIES: Record<string, number[]> = {
  requests_total:  [0, 12, 27, 41, 58, 73],
  errors_total:    [0, 1, 1, 2, 2, 3],
  refusals_total:  [0, 0, 1, 1, 1, 2],
};

function evaluate() {
  const broken: string[] = [];
  for (const [name, vals] of Object.entries(SERIES))
    for (let i = 1; i < vals.length; i++)
      if (vals[i] < vals[i - 1]) { broken.push(`${name}@${i}`); break; }
  return { pass: broken.length === 0, detail: `${Object.keys(SERIES).length} counters checked; ${broken.length} non-monotonic${broken.length ? ": " + broken.join(", ") : ""}` };
}

const r = evaluate();
console.log(`[obs-counters] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

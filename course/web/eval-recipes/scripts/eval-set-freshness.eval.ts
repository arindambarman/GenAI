/**
 * Eval set freshness — target: lead-qualifier
 * The golden eval set must be recently refreshed and reflect current product/policy reality —
 * stale sets give false confidence.
 * PASS when: newest case <= 30 days old AND >= 20% of cases added in the last 90 days.
 * Run:  npx tsx eval-set-freshness.eval.ts
 */
const TODAY = new Date("2026-06-01");
// Eval cases with the date they were added/last reviewed.
const CASES: { id: string; addedISO: string }[] = [
  { id: "c1", addedISO: "2026-05-20" },
  { id: "c2", addedISO: "2026-05-02" },
  { id: "c3", addedISO: "2026-04-15" },
  { id: "c4", addedISO: "2026-03-10" },
  { id: "c5", addedISO: "2025-12-01" },
  { id: "c6", addedISO: "2025-09-20" },
];

const daysAgo = (iso: string) => Math.floor((+TODAY - +new Date(iso)) / 86_400_000);

function evaluate() {
  const ages = CASES.map(c => daysAgo(c.addedISO));
  const newest = Math.min(...ages);
  const recentShare = ages.filter(a => a <= 90).length / CASES.length;
  return { pass: newest <= 30 && recentShare >= 0.2, detail: `newest case ${newest}d old (<=30), ${(recentShare * 100).toFixed(0)}% added in last 90d (>=20%)` };
}

const r = evaluate();
console.log(`[eval-set-freshness] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

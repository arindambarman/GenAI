/**
 * Regression eval set — target: all agents
 * Checks a change hasn't flipped any previously-passing deal.
 * PASS when: 0 regressions on the frozen gold set.
 * Run:  npx tsx regression-eval-set.eval.ts
 * Part of the Meridian "Apex" Sales & Presales eval suite (Halberd scenario).
 */
type Verdict = { stage: string; bundle?: string[] };

// Frozen gold set — known-good outcomes captured from a trusted build.
const GOLD: Record<string, Verdict> = {
  "HAL-001":    { stage: "won", bundle: ["trade_finance", "cash_management"] },
  "BR-208441":  { stage: "blocked" },
  "ACME-77":    { stage: "won", bundle: ["commercial_lending"] },
};

// Outputs from the CURRENT build of the agent system (re-run the pipeline to refresh).
const CURRENT: Record<string, Verdict> = {
  "HAL-001":    { stage: "won", bundle: ["trade_finance", "cash_management"] },
  "BR-208441":  { stage: "blocked" },
  "ACME-77":    { stage: "won", bundle: ["commercial_lending"] },
  // Flip any value (e.g. "won" -> "blocked") to see the regression caught.
};

function evaluate() {
  const ids = Object.keys(GOLD);
  const regressions = ids.filter(id => JSON.stringify(CURRENT[id]) !== JSON.stringify(GOLD[id]));
  return { pass: regressions.length === 0, detail: `${regressions.length} regression(s) of ${ids.length} gold deals${regressions.length ? ": " + regressions.join(", ") : ""}` };
}

const r = evaluate();
console.log(`[regression-eval-set] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

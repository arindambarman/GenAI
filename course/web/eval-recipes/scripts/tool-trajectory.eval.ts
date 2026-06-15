/**
 * Tool trajectory — target: sales-orchestrator
 * Did the agent call the right tools, in a sensible order, with no wasteful detours?
 * PASS when: the actual tool sequence matches the expected ordered subsequence (no missing/extra critical steps).
 * Run:  npx tsx tool-trajectory.eval.ts
 */
// Expected critical path for "qualify → design → price → compliance" on a deal.
const EXPECTED = ["crm_lookup", "qualify_lead", "design_solution", "price_quote", "compliance_check"];

// What the orchestrator actually did this run (flip an entry to break ordering).
const ACTUAL = ["crm_lookup", "qualify_lead", "design_solution", "price_quote", "compliance_check"];

function isOrderedSubsequence(expected: string[], actual: string[]) {
  let i = 0;
  for (const step of actual) if (step === expected[i]) i++;
  return i === expected.length;
}

function evaluate() {
  const ok = isOrderedSubsequence(EXPECTED, ACTUAL);
  const extra = ACTUAL.filter(s => !EXPECTED.includes(s));
  return {
    pass: ok && extra.length === 0,
    detail: `expected [${EXPECTED.join(" → ")}]; actual [${ACTUAL.join(" → ")}]; ordered=${ok}, extra detours=${extra.length}`,
  };
}

const r = evaluate();
console.log(`[tool-trajectory] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

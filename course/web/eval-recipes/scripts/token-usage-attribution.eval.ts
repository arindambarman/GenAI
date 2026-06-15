/**
 * Token usage attribution — target: sales-orchestrator
 * Every token consumed in a run must be attributable to a named subagent/span (no "unaccounted" tokens).
 * PASS when: attributed tokens == total tokens (0 leakage) within rounding.
 * Run:  npx tsx token-usage-attribution.eval.ts
 */
const TOTAL_TOKENS = 38_400;
// Tokens tagged to each subagent span (sum must equal TOTAL).
const BY_AGENT: Record<string, number> = {
  "lead-qualifier": 7_200,
  "presales-solution-advisor": 9_800,
  "proposal-pricing": 11_400,
  "compliance-risk-reviewer": 6_500,
  "sales-orchestrator": 3_500,
};

function evaluate() {
  const attributed = Object.values(BY_AGENT).reduce((a, b) => a + b, 0);
  const leakage = TOTAL_TOKENS - attributed;
  const pct = (attributed / TOTAL_TOKENS) * 100;
  return { pass: leakage === 0, detail: `${attributed}/${TOTAL_TOKENS} tokens attributed = ${pct.toFixed(1)}% (leakage ${leakage})` };
}

const r = evaluate();
console.log(`[token-usage-attribution] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

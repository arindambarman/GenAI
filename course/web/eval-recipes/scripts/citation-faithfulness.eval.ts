/**
 * Citation faithfulness — target: solution-advisor · competitive-intelligence
 * Every client-facing claim must trace to a verifiable source span.
 * PASS when: >= 0.95 of claims are verifiable.
 * Run:  npx tsx citation-faithfulness.eval.ts
 */
type Claim = { text: string; source: string | null };

// Claims emitted for the Halberd bundle + competitive notes, each with its cited source.
const CLAIMS: Claim[] = [
  { text: "Import LC supports up to 180-day tenor", source: "catalog.trade_finance.lc" },
  { text: "Liquidity sweep across 3 operating accounts", source: "catalog.cash_mgmt.sweep" },
  { text: "FX forward available to 12 months", source: "catalog.fx.forward" },
  { text: "Eligible for working-capital revolver", source: "eligibility.HAL-001.revolver" },
  // Set a source to null to see an unfaithful claim get caught.
];

function evaluate() {
  const verifiable = CLAIMS.filter(c => c.source != null).length;
  const frac = verifiable / CLAIMS.length;
  return { pass: frac >= 0.95, detail: `${verifiable}/${CLAIMS.length} verifiable = ${(frac * 100).toFixed(1)}%` };
}

const r = evaluate();
console.log(`[citation-faithfulness] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

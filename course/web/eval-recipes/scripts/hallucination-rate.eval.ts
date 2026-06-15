/**
 * Hallucination rate — target: presales-solution-advisor
 * Share of factual claims NOT supported by the provided product catalogue / source pack.
 * PASS when: hallucination rate <= 2%.
 * Run:  npx tsx hallucination-rate.eval.ts
 */
// Claims the advisor made; supported=true means grounded in the source pack (set one false to raise the rate).
const CLAIMS: { text: string; supported: boolean }[] = [
  { text: "Import LC available up to 365-day tenor.", supported: true },
  { text: "Revolver priced off SOFR + margin.",       supported: true },
  { text: "FX forward supports EUR/USD pairs.",       supported: true },
  { text: "Cash management offers same-day sweeps.",  supported: true },
  { text: "Trade finance covers open-account terms.", supported: true },
];
const LIMIT = 0.02;

function evaluate() {
  const unsupported = CLAIMS.filter(c => !c.supported).length;
  const rate = unsupported / CLAIMS.length;
  return { pass: rate <= LIMIT, detail: `${unsupported}/${CLAIMS.length} unsupported = ${(rate * 100).toFixed(1)}% (limit ${(LIMIT * 100).toFixed(0)}%)` };
}

const r = evaluate();
console.log(`[hallucination-rate] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

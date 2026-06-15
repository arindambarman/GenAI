/**
 * Schema conformance — target: proposal-pricing
 * Rate at which raw quote JSON validates against the declared schema BEFORE any repair.
 * PASS when: >= 98% of quotes are first-pass valid.
 * Run:  npx tsx schema-conformance.eval.ts
 */
type Quote = { product: string; currency: string; tenor_days: number; amount: number; indicative: boolean };

// Raw quote objects as emitted by the agent (pre-repair).
const RAW: any[] = [
  { product: "import_lc", currency: "USD", tenor_days: 180, amount: 2_000_000, indicative: true },
  { product: "revolver",  currency: "USD", tenor_days: 365, amount: 5_000_000, indicative: true },
  { product: "fx_forward", currency: "EUR", tenor_days: 90, amount: 1_500_000, indicative: true },
  // Introduce a bad field (e.g. amount: "2m") to drop the first-pass rate.
];

function valid(q: any): q is Quote {
  return typeof q.product === "string"
    && /^[A-Z]{3}$/.test(q.currency)
    && Number.isInteger(q.tenor_days) && q.tenor_days > 0
    && typeof q.amount === "number" && q.amount > 0
    && q.indicative === true;
}

function evaluate() {
  const ok = RAW.filter(valid).length;
  const rate = ok / RAW.length;
  return { pass: rate >= 0.98, detail: `${ok}/${RAW.length} first-pass valid = ${(rate * 100).toFixed(1)}%` };
}

const r = evaluate();
console.log(`[schema-conformance] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

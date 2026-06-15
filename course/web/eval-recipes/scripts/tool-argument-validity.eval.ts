/**
 * Tool argument validity — target: proposal-pricing
 * Every tool call must carry arguments that satisfy the tool's declared schema before dispatch.
 * PASS when: 100% of tool calls have valid arguments (a single bad call fails the gate).
 * Run:  npx tsx tool-argument-validity.eval.ts
 */
type PriceArgs = { product: string; currency: string; tenor_days: number; notional: number };

// Tool calls the pricing agent attempted (flip a field type to force a failure).
const CALLS: any[] = [
  { tool: "price_quote", args: { product: "import_lc", currency: "USD", tenor_days: 180, notional: 2_000_000 } },
  { tool: "price_quote", args: { product: "revolver", currency: "USD", tenor_days: 365, notional: 5_000_000 } },
  { tool: "price_quote", args: { product: "fx_forward", currency: "EUR", tenor_days: 90, notional: 1_500_000 } },
];

function validArgs(a: any): a is PriceArgs {
  return typeof a.product === "string" && a.product.length > 0
    && /^[A-Z]{3}$/.test(a.currency)
    && Number.isInteger(a.tenor_days) && a.tenor_days > 0
    && typeof a.notional === "number" && a.notional > 0;
}

function evaluate() {
  const bad = CALLS.filter(c => !validArgs(c.args));
  const rate = (CALLS.length - bad.length) / CALLS.length;
  return { pass: bad.length === 0, detail: `${CALLS.length - bad.length}/${CALLS.length} calls valid = ${(rate * 100).toFixed(0)}%${bad.length ? ` (${bad.length} bad)` : ""}` };
}

const r = evaluate();
console.log(`[tool-argument-validity] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

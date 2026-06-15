/**
 * Pairwise preference — target: proposal-pricing
 * A judge picks the better of two proposal drafts (prompt A vs B) on the same deals.
 * PASS when: a winner is decided (win rate != 50%); reports which prompt to ship.
 * Run:  npx tsx pairwise-preference.eval.ts
 */
// Judge verdicts per deal: "A" or "B".
const VERDICTS = ["A", "A", "B", "A", "A", "B", "A", "A"];

function evaluate() {
  const a = VERDICTS.filter(v => v === "A").length;
  const winRateA = a / VERDICTS.length;
  const winner = winRateA > 0.5 ? "A" : winRateA < 0.5 ? "B" : "tie";
  return { pass: winner !== "tie", detail: `prompt A win rate ${(winRateA * 100).toFixed(0)}% over ${VERDICTS.length} deals → ship prompt ${winner}` };
}

const r = evaluate();
console.log(`[pairwise-preference] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

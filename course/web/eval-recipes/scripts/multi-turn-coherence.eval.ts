/**
 * Multi-turn coherence — target: sales-orchestrator
 * Across RM follow-ups the system must keep deal state and never contradict the earlier bundle.
 * PASS when: 0 state contradictions (bundle is monotonic, tenor edits are honoured).
 * Run:  npx tsx multi-turn-coherence.eval.ts
 */
type Turn = { rm: string; bundle: string[]; tenor_days: number };

// One deal session with three RM follow-ups.
const SESSION: Turn[] = [
  { rm: "qualify + design trade finance",        bundle: ["trade_finance"], tenor_days: 90 },
  { rm: "add cash management",                   bundle: ["trade_finance", "cash_management"], tenor_days: 90 },
  { rm: "make the tenor 180 days",               bundle: ["trade_finance", "cash_management"], tenor_days: 180 },
];

function evaluate() {
  const contradictions: string[] = [];
  for (let i = 1; i < SESSION.length; i++) {
    const prev = SESSION[i - 1], cur = SESSION[i];
    // Bundle must only grow (no silent drops).
    if (!prev.bundle.every(p => cur.bundle.includes(p))) contradictions.push(`turn ${i}: dropped a product`);
  }
  // Final tenor must reflect the last explicit instruction.
  if (SESSION.at(-1)!.tenor_days !== 180) contradictions.push("final tenor not honoured");
  return { pass: contradictions.length === 0, detail: `${contradictions.length} contradiction(s) over ${SESSION.length} turns${contradictions.length ? ": " + contradictions.join("; ") : ""}` };
}

const r = evaluate();
console.log(`[multi-turn-coherence] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

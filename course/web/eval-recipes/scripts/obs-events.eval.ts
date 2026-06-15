/**
 * Structured events — target: compliance-risk-reviewer
 * Key lifecycle events (decision, refusal, escalation) must be emitted as structured logs with required fields.
 * PASS when: every expected event type is present AND each carries its required fields.
 * Run:  npx tsx obs-events.eval.ts
 */
type Event = { type: string; fields: Record<string, unknown> };

const REQUIRED: Record<string, string[]> = {
  "decision":   ["deal_id", "outcome", "confidence"],
  "refusal":    ["deal_id", "reason"],
  "escalation": ["deal_id", "to", "reason"],
};

// Emitted events (drop a field or an event type to break it).
const EVENTS: Event[] = [
  { type: "decision",   fields: { deal_id: "D-1", outcome: "qualified", confidence: 0.82 } },
  { type: "refusal",    fields: { deal_id: "D-2", reason: "missing_kyc" } },
  { type: "escalation", fields: { deal_id: "D-3", to: "human_rm", reason: "sanctioned_match" } },
];

function evaluate() {
  const problems: string[] = [];
  for (const type of Object.keys(REQUIRED)) {
    const ev = EVENTS.find(e => e.type === type);
    if (!ev) { problems.push(`missing event: ${type}`); continue; }
    for (const f of REQUIRED[type]) if (!(f in ev.fields)) problems.push(`${type} missing field: ${f}`);
  }
  return { pass: problems.length === 0, detail: `${EVENTS.length} events checked; ${problems.length} problem(s)${problems.length ? ": " + problems.join("; ") : ""}` };
}

const r = evaluate();
console.log(`[obs-events] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

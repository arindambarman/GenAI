/**
 * Per-agent metric breakdown — target: sales-orchestrator
 * Every active subagent must emit its own labelled metrics — no subagent should be a blind spot.
 * PASS when: all expected subagents report a metric row AND none shows a null/NaN value.
 * Run:  npx tsx obs-per-agent.eval.ts
 */
const EXPECTED_AGENTS = [
  "lead-qualifier", "presales-solution-advisor", "proposal-pricing",
  "compliance-risk-reviewer", "competitive-intelligence", "onboarding-handoff",
];

// Reported rows: agent → p95 latency ms (set one to NaN or omit an agent to break it).
const REPORTED: Record<string, number> = {
  "lead-qualifier": 1200,
  "presales-solution-advisor": 2600,
  "proposal-pricing": 3100,
  "compliance-risk-reviewer": 1800,
  "competitive-intelligence": 2200,
  "onboarding-handoff": 1400,
};

function evaluate() {
  const missing = EXPECTED_AGENTS.filter(a => !(a in REPORTED));
  const bad = Object.entries(REPORTED).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
  return { pass: missing.length === 0 && bad.length === 0, detail: `${EXPECTED_AGENTS.length} agents expected; missing=${missing.length}, bad-values=${bad.length}${missing.length ? ` (no row: ${missing.join(", ")})` : ""}` };
}

const r = evaluate();
console.log(`[obs-per-agent] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

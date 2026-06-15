/**
 * On-call playbook coverage — target: compliance-risk-reviewer
 * Every critical alert must link to a runbook with the required sections so responders aren't improvising.
 * PASS when: every critical alert has a runbook AND each runbook has all required sections.
 * Run:  npx tsx obs-oncall-playbook.eval.ts
 */
const REQUIRED_SECTIONS = ["symptom", "impact", "diagnosis", "mitigation", "escalation"];

// alert → runbook sections present (drop a section to break it).
const RUNBOOKS: Record<string, string[]> = {
  "error_rate_spike":    ["symptom", "impact", "diagnosis", "mitigation", "escalation"],
  "latency_breach":      ["symptom", "impact", "diagnosis", "mitigation", "escalation"],
  "compliance_miss":     ["symptom", "impact", "diagnosis", "mitigation", "escalation"],
  "cost_blowout":        ["symptom", "impact", "diagnosis", "mitigation", "escalation"],
};
const CRITICAL_ALERTS = ["error_rate_spike", "latency_breach", "compliance_miss", "cost_blowout"];

function evaluate() {
  const problems: string[] = [];
  for (const a of CRITICAL_ALERTS) {
    const rb = RUNBOOKS[a];
    if (!rb) { problems.push(`no runbook: ${a}`); continue; }
    const missing = REQUIRED_SECTIONS.filter(s => !rb.includes(s));
    if (missing.length) problems.push(`${a} missing: ${missing.join("/")}`);
  }
  return { pass: problems.length === 0, detail: `${CRITICAL_ALERTS.length} critical alerts; ${problems.length} gap(s)${problems.length ? ": " + problems.join("; ") : ""}` };
}

const r = evaluate();
console.log(`[obs-oncall-playbook] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

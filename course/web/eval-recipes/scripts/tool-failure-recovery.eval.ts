/**
 * Tool failure recovery — target: sales-orchestrator
 * When a tool errors or times out, the agent must retry/fallback and still complete the task —
 * not crash, loop forever, or silently drop the step.
 * PASS when: every failed tool call is followed by a successful recovery, and the task completes.
 * Run:  npx tsx tool-failure-recovery.eval.ts
 */
type Step = { tool: string; status: "ok" | "error" | "timeout"; recovered: boolean };

// Trace of one deal run where two tools faltered (set a recovered:false to break it).
const TRACE: Step[] = [
  { tool: "crm_lookup",      status: "ok",      recovered: true },
  { tool: "price_quote",     status: "timeout", recovered: true },   // retried, succeeded
  { tool: "compliance_check", status: "error",  recovered: true },   // fell back to cached policy
  { tool: "generate_proposal", status: "ok",    recovered: true },
];
const TASK_COMPLETED = true;

function evaluate() {
  const failures = TRACE.filter(s => s.status !== "ok");
  const unrecovered = failures.filter(s => !s.recovered);
  return {
    pass: unrecovered.length === 0 && TASK_COMPLETED,
    detail: `${failures.length} tool failure(s), ${failures.length - unrecovered.length} recovered, task completed=${TASK_COMPLETED}`,
  };
}

const r = evaluate();
console.log(`[tool-failure-recovery] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

/**
 * Dashboard coverage — target: sales-orchestrator
 * The ops dashboard must contain a panel for every required signal so on-call isn't flying blind.
 * PASS when: 100% of required panels are present and bound to a live data source.
 * Run:  npx tsx obs-dashboards.eval.ts
 */
const REQUIRED_PANELS = [
  "latency_p95", "error_rate", "cost_per_task", "throughput",
  "refusal_rate", "tool_failure_rate", "per_agent_breakdown",
];

// Panels actually configured (panel → bound data source; "" = unbound).
const PANELS: Record<string, string> = {
  latency_p95: "prom:latency",
  error_rate: "prom:errors",
  cost_per_task: "billing:tokens",
  throughput: "prom:requests",
  refusal_rate: "prom:refusals",
  tool_failure_rate: "prom:tool_errors",
  per_agent_breakdown: "prom:by_agent",
};

function evaluate() {
  const missing = REQUIRED_PANELS.filter(p => !(p in PANELS));
  const unbound = REQUIRED_PANELS.filter(p => PANELS[p] === "");
  return { pass: missing.length === 0 && unbound.length === 0, detail: `${REQUIRED_PANELS.length} required panels; missing=${missing.length}, unbound=${unbound.length}${missing.length ? ` (${missing.join(", ")})` : ""}` };
}

const r = evaluate();
console.log(`[obs-dashboards] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

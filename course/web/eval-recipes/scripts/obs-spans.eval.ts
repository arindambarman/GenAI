/**
 * Span completeness — target: sales-orchestrator
 * Every span must carry the mandatory attributes (name, start, end, status) and have end >= start.
 * PASS when: 100% of spans are well-formed.
 * Run:  npx tsx obs-spans.eval.ts
 */
type Span = { name: string; startMs: number; endMs: number; status: "ok" | "error" };

// Emitted spans (set endMs < startMs or blank a name to break it).
const SPANS: Span[] = [
  { name: "qualify",    startMs: 0,    endMs: 820,  status: "ok" },
  { name: "design",     startMs: 820,  endMs: 1900, status: "ok" },
  { name: "price",      startMs: 1900, endMs: 3100, status: "ok" },
  { name: "compliance", startMs: 3100, endMs: 3950, status: "ok" },
];

function wellFormed(s: Span) {
  return s.name.length > 0
    && Number.isFinite(s.startMs) && Number.isFinite(s.endMs)
    && s.endMs >= s.startMs
    && (s.status === "ok" || s.status === "error");
}

function evaluate() {
  const bad = SPANS.filter(s => !wellFormed(s));
  const rate = (SPANS.length - bad.length) / SPANS.length;
  return { pass: bad.length === 0, detail: `${SPANS.length - bad.length}/${SPANS.length} spans well-formed = ${(rate * 100).toFixed(0)}%` };
}

const r = evaluate();
console.log(`[obs-spans] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

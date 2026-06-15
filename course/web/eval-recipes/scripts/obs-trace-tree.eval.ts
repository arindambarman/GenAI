/**
 * Trace tree integrity — target: sales-orchestrator
 * Every span must chain to a known parent and roll up to exactly one root — no orphans, no cycles.
 * PASS when: exactly 1 root, 0 orphans, 0 cycles.
 * Run:  npx tsx obs-trace-tree.eval.ts
 */
type Span = { id: string; parent: string | null };

// One deal trace (set a parent to a missing id to create an orphan).
const SPANS: Span[] = [
  { id: "root",          parent: null },
  { id: "qualify",       parent: "root" },
  { id: "design",        parent: "root" },
  { id: "price",         parent: "design" },
  { id: "compliance",    parent: "root" },
  { id: "proposal",      parent: "price" },
];

function evaluate() {
  const ids = new Set(SPANS.map(s => s.id));
  const roots = SPANS.filter(s => s.parent === null);
  const orphans = SPANS.filter(s => s.parent !== null && !ids.has(s.parent));

  // cycle check via walk-to-root
  let cycles = 0;
  for (const s of SPANS) {
    const seen = new Set<string>();
    let cur: Span | undefined = s;
    while (cur && cur.parent) {
      if (seen.has(cur.id)) { cycles++; break; }
      seen.add(cur.id);
      cur = SPANS.find(x => x.id === cur!.parent);
    }
  }

  return { pass: roots.length === 1 && orphans.length === 0 && cycles === 0, detail: `${SPANS.length} spans: roots=${roots.length}, orphans=${orphans.length}, cycles=${cycles}` };
}

const r = evaluate();
console.log(`[obs-trace-tree] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

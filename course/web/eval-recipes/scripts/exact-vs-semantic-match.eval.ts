/**
 * Exact vs semantic match — target: onboarding-handoff (exact) · lead-qualifier (semantic)
 * Onboarding checklist must EXACTLY equal the canonical list (deterministic);
 * qualifier rationale is scored by semantic (token-overlap) similarity.
 * PASS when: exact match is identical AND semantic similarity >= 0.80.
 * Run:  npx tsx exact-vs-semantic-match.eval.ts
 */
const CANONICAL_CHECKLIST = ["KYC pack", "Board resolution", "Facility agreement", "Mandate form"];
const PRODUCED_CHECKLIST  = ["KYC pack", "Board resolution", "Facility agreement", "Mandate form"];

const REFERENCE_RATIONALE = "strong budget decision maker urgent trade finance need";
const PRODUCED_RATIONALE  = "decision maker with strong budget and urgent trade finance need";

const exactMatch = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

function jaccard(a: string, b: string) {
  const sa = new Set(a.toLowerCase().split(/\s+/));
  const sb = new Set(b.toLowerCase().split(/\s+/));
  const inter = [...sa].filter(x => sb.has(x)).length;
  return inter / new Set([...sa, ...sb]).size;
}

function evaluate() {
  const exact = exactMatch(PRODUCED_CHECKLIST, CANONICAL_CHECKLIST);
  const sim = jaccard(PRODUCED_RATIONALE, REFERENCE_RATIONALE);
  return { pass: exact && sim >= 0.8, detail: `exact=${exact}, semantic=${sim.toFixed(2)} (>=0.80)` };
}

const r = evaluate();
console.log(`[exact-vs-semantic-match] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

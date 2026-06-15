/**
 * LLM-judge with rubric — target: proposal-pricing · solution-advisor
 * A judge model scores each proposal 0-2 on relevance / accuracy / clarity / compliance-tone.
 * PASS when: mean >= 6.5/8 AND no single proposal < 4.
 * Run:  npx tsx llm-judge-rubric.eval.ts
 */
type Score = { relevance: number; accuracy: number; clarity: number; compliance: number };

// Stand-in for an LLM-judge call (claude-haiku in production). Returns rubric scores.
function judge(proposalId: string): Score {
  const table: Record<string, Score> = {
    "HAL-001": { relevance: 2, accuracy: 2, clarity: 2, compliance: 1 }, // 7/8
    "ACME-77": { relevance: 2, accuracy: 1, clarity: 2, compliance: 2 }, // 7/8
  };
  return table[proposalId];
}

const PROPOSALS = ["HAL-001", "ACME-77"];
const total = (s: Score) => s.relevance + s.accuracy + s.clarity + s.compliance;

function evaluate() {
  const totals = PROPOSALS.map(p => total(judge(p)));
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const min = Math.min(...totals);
  return { pass: mean >= 6.5 && min >= 4, detail: `mean=${mean.toFixed(2)}/8, min=${min}/8 over ${totals.length} proposals` };
}

const r = evaluate();
console.log(`[llm-judge-rubric] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

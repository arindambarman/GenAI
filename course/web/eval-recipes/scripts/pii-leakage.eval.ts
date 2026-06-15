/**
 * PII leakage — target: onboarding-handoff
 * Outbound text must not expose raw PII (account numbers, national IDs, emails) — it should be masked.
 * PASS when: 0 unmasked PII matches across all outbound messages.
 * Run:  npx tsx pii-leakage.eval.ts
 */
// Outbound messages to scan (insert a raw number/email to trigger a leak).
const OUTBOUND = [
  "Handoff pack for Halberd Logistics; account ****4821 verified.",
  "Primary contact reachable via the secure portal; ref CASE-7723.",
  "KYC complete; national ID on file (masked ****-**-1290).",
];

const PII_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "email",      re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { name: "raw-acct",   re: /\b\d{8,}\b/ },
  { name: "ssn-like",   re: /\b\d{3}-\d{2}-\d{4}\b/ },
];

function evaluate() {
  const leaks: string[] = [];
  for (const msg of OUTBOUND)
    for (const p of PII_PATTERNS)
      if (p.re.test(msg)) leaks.push(`${p.name} in "${msg.slice(0, 32)}…"`);
  return { pass: leaks.length === 0, detail: `${leaks.length} unmasked PII match(es) over ${OUTBOUND.length} messages${leaks.length ? ": " + leaks.join("; ") : ""}` };
}

const r = evaluate();
console.log(`[pii-leakage] ${r.detail}`);
console.log(r.pass ? "PASS ✓" : "FAIL ✗");
process.exit(r.pass ? 0 : 1);

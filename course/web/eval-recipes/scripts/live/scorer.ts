/**
 * Scorer — schema-conformance metric (the SAME logic as scripts/schema-conformance.eval.ts,
 * but exported so a live harness can score REAL agent output instead of a fixture).
 *
 * Metric: fraction of raw quote objects that validate against the declared schema
 * on the FIRST pass (before any repair/retry). Target agent: proposal-pricing.
 */
import { z } from "zod";

/** Matches proposal-pricing's "Output contract" → quotes[] item. */
export const QuoteSchema = z.object({
  product: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/, "ISO-4217 3-letter code"),
  tenor_days: z.number().int().positive(),
  amount: z.number().positive(),
  fee_bps: z.number().nonnegative(),
  spread_bps: z.number().nonnegative(),
  indicative: z.literal(true),
  tool: z.string().min(1),
  args_valid: z.boolean(),
});
export type Quote = z.infer<typeof QuoteSchema>;

/** Pass when first-pass valid rate >= 98%. */
export const THRESHOLD = 0.98;

export type ScoreResult = {
  valid: number;
  total: number;
  rate: number;
  failures: { index: number; issues: string }[];
};

/** Score one deal's worth of raw quotes against the schema. */
export function scoreQuotes(quotes: unknown[]): ScoreResult {
  let valid = 0;
  const failures: ScoreResult["failures"] = [];
  quotes.forEach((q, i) => {
    const r = QuoteSchema.safeParse(q);
    if (r.success) valid++;
    else failures.push({
      index: i,
      issues: r.error.issues.map(x => `${x.path.join(".") || "(root)"}: ${x.message}`).join("; "),
    });
  });
  const total = quotes.length;
  return { valid, total, rate: total ? valid / total : 0, failures };
}

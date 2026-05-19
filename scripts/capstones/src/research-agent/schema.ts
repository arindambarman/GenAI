import { z } from "zod";

export const ResearchQuerySchema = z.object({
  question: z.string().min(10),
  maxSources: z.number().int().min(1).max(20).default(8),
  minSources: z.number().int().min(1).max(20).default(3),
});
export type ResearchQuery = z.infer<typeof ResearchQuerySchema>;

export const CitationSchema = z.object({
  source_id: z.string(),
  title: z.string(),
  passage: z.string(),
  supports: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const SynthesisSchema = z.object({
  question: z.string(),
  summary: z.string().min(50),
  key_findings: z.array(z.string()).min(1),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),
  caveats: z.array(z.string()),
});
export type Synthesis = z.infer<typeof SynthesisSchema>;

export const FaithfulnessReportSchema = z.object({
  total_claims: z.number(),
  supported: z.number(),
  unsupported: z.number(),
  faithfulness_score: z.number().min(0).max(1),
  unsupported_claims: z.array(z.object({
    claim: z.string(),
    cited_source: z.string(),
    reason: z.string(),
  })),
});
export type FaithfulnessReport = z.infer<typeof FaithfulnessReportSchema>;

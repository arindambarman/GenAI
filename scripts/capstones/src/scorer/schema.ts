import { z } from "zod";

export const BloomDepthSchema = z.number().int().min(0).max(5);
export const ConfidenceSchema = z.number().int().min(0).max(5);

export const EvidenceTypeSchema = z.enum(["self", "quiz", "judge", "artifact"]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceSchema = z.object({
  type: EvidenceTypeSchema,
  ref: z.string(),                              // e.g. "Q2.2", "lab-4.1", "self-rating"
  score: z.number().min(0).max(5).optional(),
  date: z.string(),                             // ISO date
  note: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const ReviewEntrySchema = z.object({
  date: z.string(),
  depth: BloomDepthSchema,
  confidence: ConfidenceSchema,
  source: EvidenceTypeSchema,
});
export type ReviewEntry = z.infer<typeof ReviewEntrySchema>;

export const ConceptScoreSchema = z.object({
  concept_id: z.string(),
  name: z.string(),
  module: z.string(),                           // e.g. "M2"
  category: z.string(),                         // e.g. "foundational" / "math" / ...
  importance: z.number().int().min(1).max(10),
  depth: BloomDepthSchema,
  confidence: ConfidenceSchema,
  last_reviewed: z.string().nullable(),
  review_history: z.array(ReviewEntrySchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  notes: z.string().optional(),
});
export type ConceptScore = z.infer<typeof ConceptScoreSchema>;

export const ProgressSchema = z.object({
  learner_id: z.string().default("default"),
  started_at: z.string(),
  last_session: z.string().nullable().default(null),
  concepts: z.array(ConceptScoreSchema),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const ComputedConceptSchema = ConceptScoreSchema.extend({
  peak_score: z.number(),
  decayed_score: z.number(),
  days_since_review: z.number().nullable(),
  half_life_days: z.number(),
  status: z.enum(["unstarted", "weak", "wobbly", "mastered"]),
});
export type ComputedConcept = z.infer<typeof ComputedConceptSchema>;

export const ModuleAggregateSchema = z.object({
  module: z.string(),
  concept_count: z.number(),
  unstarted: z.number(),
  weak: z.number(),
  wobbly: z.number(),
  mastered: z.number(),
  weighted_score: z.number(),       // 0-5 weighted by importance
  raw_average: z.number(),          // 0-5 simple average
});
export type ModuleAggregate = z.infer<typeof ModuleAggregateSchema>;

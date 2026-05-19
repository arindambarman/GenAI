import { z } from "zod";

export const TechniqueSchema = z.enum([
  "analogy",         // What is this like in other domains?
  "decomposition",   // What are the sub-problems?
  "inversion",       // What's the opposite of solving this?
  "recombination",   // What if we mash up existing solutions?
  "what_if",         // What if we removed a constraint?
  "user_journey",    // Walk through who's affected and how
  "extreme_cases",   // What about 10x scale? 1/10th cost?
]);
export type Technique = z.infer<typeof TechniqueSchema>;

export const IdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().min(20),
  technique: TechniqueSchema,
  scores: z.object({
    novelty: z.number().min(0).max(10),
    feasibility: z.number().min(0).max(10),
    impact: z.number().min(0).max(10),
    cost: z.number().min(0).max(10).describe("Lower is cheaper; 10 = very expensive"),
  }),
  notes: z.string(),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const BrainstormQuerySchema = z.object({
  topic: z.string().min(10),
  context: z.string().optional(),
  constraints: z.array(z.string()).default([]),
  num_techniques: z.number().int().min(2).max(7).default(4),
  ideas_per_technique: z.number().int().min(2).max(8).default(4),
});
export type BrainstormQuery = z.infer<typeof BrainstormQuerySchema>;

export const BrainstormReportSchema = z.object({
  topic: z.string(),
  ideas: z.array(IdeaSchema),
  top_three: z.array(z.object({
    id: z.string(),
    why_chosen: z.string(),
    next_steps: z.array(z.string()),
  })),
  summary: z.string().min(50),
});
export type BrainstormReport = z.infer<typeof BrainstormReportSchema>;

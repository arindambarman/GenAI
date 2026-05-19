import { z } from "zod";

export const ConceptCategorySchema = z.enum([
  "foundational",
  "architecture",
  "operational",
  "math",
  "safety",
  "business",
  "frontier",
]);
export type ConceptCategory = z.infer<typeof ConceptCategorySchema>;

export const ConceptSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase-with-hyphens"),
  name: z.string(),
  definition: z.string().min(20),
  source_lessons: z.array(z.string()).min(1),
  category: ConceptCategorySchema,
  importance: z.number().int().min(1).max(10),
  notes: z.string().optional(),
});
export type Concept = z.infer<typeof ConceptSchema>;

export const RelationshipTypeSchema = z.enum([
  "uses",            // A uses/depends on B
  "extends",         // A is an extension of B
  "specializes",     // A is a specific case of B
  "alternative_to",  // A is an alternative to B
  "contrasts",       // A and B are deliberately contrasted
  "composes",        // A composes B (B is a sub-part of A)
  "precedes",        // A should be learned before B
]);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const RelationshipSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: RelationshipTypeSchema,
  reason: z.string().min(10),
  source_lesson: z.string(),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

export const OptimizationTypeSchema = z.enum([
  "sequencing",
  "missing_prerequisite",
  "redundant_coverage",
  "weak_explanation",
  "missing_example",
  "missing_practice",
  "cross_module_link",
]);
export type OptimizationType = z.infer<typeof OptimizationTypeSchema>;

export const OptimizationSchema = z.object({
  type: OptimizationTypeSchema,
  target_lessons: z.array(z.string()).min(1),
  current_state: z.string().min(20),
  suggestion: z.string().min(20),
  rationale: z.string().min(20),
  priority: z.enum(["low", "medium", "high"]),
});
export type Optimization = z.infer<typeof OptimizationSchema>;

export const LearningPathSchema = z.object({
  name: z.string(),
  audience: z.string(),
  description: z.string(),
  lesson_sequence: z.array(z.string()).min(3),
  estimated_hours: z.number().positive(),
});
export type LearningPath = z.infer<typeof LearningPathSchema>;

export const LearningReportSchema = z.object({
  summary: z.string().min(100),
  modules_processed: z.array(z.string()),
  total_concepts: z.number().int().nonnegative(),
  total_relationships: z.number().int().nonnegative(),
  total_optimizations: z.number().int().nonnegative(),
  mindmap_mermaid: z.string().min(20),
  knowledge_graph_mermaid: z.string().min(20),
  learning_paths: z.array(LearningPathSchema).min(1),
  key_insights: z.array(z.string()).min(3),
});
export type LearningReport = z.infer<typeof LearningReportSchema>;

export const LearnerInputSchema = z.object({
  modules: z.array(z.string()).optional().describe("Module IDs to process; omit for all"),
  outputDir: z.string().default("learner-output"),
});
export type LearnerInput = z.infer<typeof LearnerInputSchema>;

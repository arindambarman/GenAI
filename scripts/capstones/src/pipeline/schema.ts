import { z } from "zod";

/**
 * Shared types for the agent pipeline.
 *
 * The pipeline runs a sequence of stages, each wrapping one of the
 * capstone agents. State flows through stages, accumulating data.
 */

export const PipelineConceptSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  category: z.string(),
  importance: z.number().int().min(1).max(10),
  source: z.enum(["learner", "knowledge-base", "brainstorm", "research"]),
  source_lessons: z.array(z.string()).default([]),
});
export type PipelineConcept = z.infer<typeof PipelineConceptSchema>;

export const ProposedTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  technique: z.string(),
  scores: z.object({
    novelty: z.number(),
    feasibility: z.number(),
    impact: z.number(),
    cost: z.number(),
  }),
});
export type ProposedTopic = z.infer<typeof ProposedTopicSchema>;

export const GroundedTopicSchema = z.object({
  topic: ProposedTopicSchema,
  research_summary: z.string(),
  citations: z.array(z.object({
    source_id: z.string(),
    title: z.string(),
    passage: z.string(),
    supports: z.string(),
  })),
  faithfulness_score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});
export type GroundedTopic = z.infer<typeof GroundedTopicSchema>;

export const DraftProposalSchema = z.object({
  topic_id: z.string(),
  proposed_lesson_id: z.string(),
  proposed_lesson_title: z.string(),
  insertion_point: z.string(),
  rationale: z.string(),
  outline: z.object({
    business_scenario: z.string(),
    key_concepts: z.array(z.string()),
    math_required: z.string(),
    suggested_examples: z.array(z.string()),
  }),
  estimated_hours: z.number().positive(),
  dependencies: z.array(z.string()),
  citations: z.array(z.object({
    source_id: z.string(),
    title: z.string(),
  })),
});
export type DraftProposal = z.infer<typeof DraftProposalSchema>;

export const StageResultSchema = z.object({
  stage: z.string(),
  ok: z.boolean(),
  startedAt: z.number(),
  endedAt: z.number(),
  durationMs: z.number(),
  cost: z.number(),
  llmCalls: z.number(),
  toolCalls: z.number(),
  error: z.string().optional(),
  note: z.string().optional(),
});
export type StageResult = z.infer<typeof StageResultSchema>;

export interface PipelineState {
  goal: string;
  startedAt: number;

  // Stage outputs accumulate here
  learner_concepts: PipelineConcept[];
  learner_optimizations: Array<{ type: string; target_lessons: string[]; suggestion: string; priority: string }>;
  kb_notes_created: string[];
  proposed_topics: ProposedTopic[];
  research_grounded: GroundedTopic[];
  draft_proposals: DraftProposal[];

  // Metadata
  totalCost: number;
  totalLLMCalls: number;
  totalToolCalls: number;
  stageResults: StageResult[];
  outputDir: string;
}

export const PipelineConfigSchema = z.object({
  goal: z.string().default("Identify missing topics in the course and propose new lessons"),
  outputDir: z.string().default("pipeline-output"),
  useCachedLearner: z.string().optional().describe("Path to existing concepts.json to skip the learner stage"),
  modules: z.array(z.string()).optional().describe("Limit learner stage to these module IDs"),
  numProposedTopics: z.number().int().min(1).max(10).default(5),
  researchPerTopic: z.boolean().default(true),
});
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

export function newPipelineState(config: PipelineConfig): PipelineState {
  return {
    goal: config.goal,
    startedAt: Date.now(),
    learner_concepts: [],
    learner_optimizations: [],
    kb_notes_created: [],
    proposed_topics: [],
    research_grounded: [],
    draft_proposals: [],
    totalCost: 0,
    totalLLMCalls: 0,
    totalToolCalls: 0,
    stageResults: [],
    outputDir: config.outputDir,
  };
}

import { z } from "zod";

// ─── Agent Names ────────────────────────────────────────────────────────────

export const AgentName = z.enum([
  "master",
  "scout",
  "content_creator",
  "assessment",
  "learning",
  "chat_ui",
]);
export type AgentName = z.infer<typeof AgentName>;

// ─── Message Types ──────────────────────────────────────────────────────────

export const MessageType = z.enum([
  // Chat UI → Master
  "UserMessage",
  // Master → Agents
  "JobDispatch",
  // Scout → Bus
  "SkillMapReady",
  // Content Creator → Bus
  "ContentReady",
  // Assessment → Bus
  "AssessmentResult",
  "GapSignal",
  // Learning → Bus
  "SessionUpdate",
  "AssessmentTrigger",
  "ProgressUpdate",
]);
export type MessageType = z.infer<typeof MessageType>;

// ─── Message Status ─────────────────────────────────────────────────────────

export const MessageStatus = z.enum(["pending", "processing", "done", "failed"]);
export type MessageStatus = z.infer<typeof MessageStatus>;

// ─── Intent Classification ──────────────────────────────────────────────────

export const Intent = z.enum(["research", "create_content", "assess", "learn", "unknown"]);
export type Intent = z.infer<typeof Intent>;

// ─── Depth Levels ───────────────────────────────────────────────────────────

export const Depth = z.enum(["beginner", "intermediate", "advanced"]);
export type Depth = z.infer<typeof Depth>;

// ─── Assessment Outcome ─────────────────────────────────────────────────────

export const Outcome = z.enum(["PASS", "PARTIAL", "FAIL"]);
export type Outcome = z.infer<typeof Outcome>;

// ─── Recommendation ─────────────────────────────────────────────────────────

export const Recommendation = z.enum(["advance", "needs_remediation", "needs_review"]);
export type Recommendation = z.infer<typeof Recommendation>;

// ─── Progress Status ────────────────────────────────────────────────────────

export const ProgressStatus = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "needs_remediation",
]);
export type ProgressStatus = z.infer<typeof ProgressStatus>;

// ─── Topic ──────────────────────────────────────────────────────────────────

export const TopicSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Topic = z.infer<typeof TopicSchema>;

// ─── Skill Map ──────────────────────────────────────────────────────────────

export const SkillEntrySchema = z.object({
  skill: z.string().min(1),
  demand_score: z.number().min(0).max(1),
  level: Depth,
});
export type SkillEntry = z.infer<typeof SkillEntrySchema>;

export const SkillMapSchema = z.object({
  id: z.string().uuid(),
  topic_id: z.string().uuid(),
  skills: z.array(SkillEntrySchema),
  source_summary: z.string().nullable(),
  generated_at: z.string().datetime({ offset: true }),
  created_at: z.string().datetime({ offset: true }),
});
export type SkillMap = z.infer<typeof SkillMapSchema>;

// ─── Content Item ───────────────────────────────────────────────────────────

export const QuestionSchema = z.object({
  q: z.string().min(1),
  options: z.array(z.string()).min(2),
  answer: z.string().min(1),
  explanation: z.string().min(1),
});
export type Question = z.infer<typeof QuestionSchema>;

export const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const ContentItemSchema = z.object({
  id: z.string().uuid(),
  topic_id: z.string().uuid(),
  skill: z.string().min(1),
  depth: Depth,
  prose: z.string().min(1),
  key_concepts: z.array(z.string()),
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  version: z.number().int().positive(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type ContentItem = z.infer<typeof ContentItemSchema>;

// ─── Assessment Result ──────────────────────────────────────────────────────

export const AnswerRecordSchema = z.object({
  question_index: z.number().int().min(0),
  user_answer: z.string(),
  correct: z.boolean(),
});
export type AnswerRecord = z.infer<typeof AnswerRecordSchema>;

export const AssessmentResultSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  content_item_id: z.string().uuid(),
  topic: z.string().min(1),
  score: z.number().min(0).max(1),
  outcome: Outcome,
  gaps: z.array(z.string()),
  answers: z.array(AnswerRecordSchema),
  recommendation: Recommendation.nullable(),
  created_at: z.string().datetime({ offset: true }),
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

// ─── User Progress ──────────────────────────────────────────────────────────

export const UserProgressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  topic_id: z.string().uuid(),
  skill: z.string().min(1),
  status: ProgressStatus,
  current_depth: Depth,
  last_score: z.number().min(0).max(1).nullable(),
  last_content_item_id: z.string().uuid().nullable(),
  updated_at: z.string().datetime({ offset: true }),
  created_at: z.string().datetime({ offset: true }),
});
export type UserProgress = z.infer<typeof UserProgressSchema>;

// ─── Agent Message (Context Bus) ────────────────────────────────────────────

export const AgentMessageSchema = z.object({
  id: z.string().uuid(),
  from_agent: AgentName,
  to_agent: AgentName,
  message_type: MessageType,
  payload: z.record(z.unknown()),
  status: MessageStatus,
  error_message: z.string().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

// ─── Agent Message Insert (no id/timestamps) ───────────────────────────────

export const AgentMessageInsertSchema = z.object({
  from_agent: AgentName,
  to_agent: AgentName,
  message_type: MessageType,
  payload: z.record(z.unknown()),
  status: MessageStatus.optional().default("pending"),
});
export type AgentMessageInsert = z.infer<typeof AgentMessageInsertSchema>;

// ─── Master Agent Log ───────────────────────────────────────────────────────

export const MasterAgentLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  raw_input: z.string().min(1),
  intent: Intent,
  dispatched_to: AgentName.nullable(),
  response: z.string().nullable(),
  agent_message_id: z.string().uuid().nullable().optional(),
  duration_ms: z.number().int().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
});
export type MasterAgentLog = z.infer<typeof MasterAgentLogSchema>;

// ─── Job Dispatch Payload ───────────────────────────────────────────────────

export const JobDispatchPayloadSchema = z.object({
  intent: Intent,
  topic: z.string().optional(),
  topic_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  depth: Depth.optional(),
  content_item_id: z.string().uuid().optional(),
  raw_input: z.string(),
});
export type JobDispatchPayload = z.infer<typeof JobDispatchPayloadSchema>;

// ─── Gap Signal Payload ─────────────────────────────────────────────────────

export const GapSignalPayloadSchema = z.object({
  topic: z.string().min(1),
  score: z.number().min(0).max(1),
  outcome: Outcome,
  gaps: z.array(z.string()),
  recommendation: Recommendation,
  user_id: z.string().uuid(),
  assessment_result_id: z.string().uuid(),
});
export type GapSignalPayload = z.infer<typeof GapSignalPayloadSchema>;

// ─── LLM Output Schemas (for Zod validation of Claude responses) ────────────

export const LLMIntentClassificationSchema = z.object({
  intent: Intent,
  topic: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type LLMIntentClassification = z.infer<typeof LLMIntentClassificationSchema>;

export const LLMSkillMapOutputSchema = z.object({
  topic: z.string().min(1),
  skills: z.array(SkillEntrySchema).min(1),
  summary: z.string().optional(),
});
export type LLMSkillMapOutput = z.infer<typeof LLMSkillMapOutputSchema>;

export const LLMContentOutputSchema = z.object({
  prose: z.string().min(1),
  key_concepts: z.array(z.string()).min(1),
  questions: z.array(QuestionSchema).min(1),
  flashcards: z.array(FlashcardSchema).min(1),
});
export type LLMContentOutput = z.infer<typeof LLMContentOutputSchema>;

export const LLMAssessmentScoringSchema = z.object({
  score: z.number().min(0).max(1),
  outcome: Outcome,
  gaps: z.array(z.string()),
  recommendation: Recommendation,
  feedback: z.string().optional(),
});
export type LLMAssessmentScoring = z.infer<typeof LLMAssessmentScoringSchema>;

import { dispatchMessage } from "@adaptlearn/shared/bus";
import { getSupabaseClient } from "@adaptlearn/shared/db";
import type {
  AgentMessage,
  AgentName,
  Intent,
  JobDispatchPayload,
} from "@adaptlearn/shared/types";
import { classifyIntent } from "./classifier.js";

/**
 * Map intents to target agents.
 */
const INTENT_TO_AGENT: Record<string, AgentName> = {
  research: "scout",
  create_content: "content_creator",
  assess: "assessment",
  learn: "learning",
};

export interface MasterAgentInput {
  userId: string;
  message: string;
}

export interface MasterAgentResult {
  intent: Intent;
  topic: string | undefined;
  confidence: number;
  dispatchedTo: AgentName | null;
  agentMessageId: string | null;
  response: string;
}

/**
 * Master Agent — POC v1
 *
 * 1. Classifies user intent via Claude Sonnet
 * 2. Resolves topic to a topic_id from the DB
 * 3. Dispatches a JobDispatch message to the right agent via Context Bus
 * 4. Logs everything to master_agent_log
 * 5. Returns a user-facing response
 */
export async function handleUserMessage(
  input: MasterAgentInput
): Promise<MasterAgentResult> {
  const startTime = Date.now();
  const db = getSupabaseClient();

  // Step 1: Classify intent
  const classification = await classifyIntent(input.message);
  const { intent, topic, confidence } = classification;

  // Step 2: Resolve topic to topic_id (if topic was extracted)
  let topicId: string | undefined;
  if (topic) {
    const { data: topicRow } = await db
      .from("topics")
      .select("id")
      .ilike("name", `%${topic}%`)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (topicRow) {
      topicId = topicRow.id;
    }
  }

  // Step 3: Dispatch to the target agent via Context Bus
  const targetAgent = INTENT_TO_AGENT[intent] ?? null;
  let agentMessageId: string | null = null;

  if (targetAgent) {
    const payload: JobDispatchPayload = {
      intent,
      topic: topic ?? undefined,
      topic_id: topicId,
      user_id: input.userId,
      raw_input: input.message,
    };

    const dispatched = await dispatchMessage({
      from_agent: "master",
      to_agent: targetAgent,
      message_type: "JobDispatch",
      payload: payload as unknown as Record<string, unknown>,
      status: "pending",
    });

    agentMessageId = dispatched.id;
  }

  // Step 4: Build user-facing response
  const response = buildResponse(intent, topic, targetAgent);

  // Step 5: Log to master_agent_log
  const durationMs = Date.now() - startTime;
  await db.from("master_agent_log").insert({
    user_id: input.userId,
    raw_input: input.message,
    intent,
    dispatched_to: targetAgent,
    response,
    agent_message_id: agentMessageId,
    duration_ms: durationMs,
  });

  return {
    intent,
    topic,
    confidence,
    dispatchedTo: targetAgent,
    agentMessageId,
    response,
  };
}

/**
 * Build a user-facing response based on intent classification.
 */
function buildResponse(
  intent: Intent,
  topic: string | undefined,
  targetAgent: AgentName | null
): string {
  const topicLabel = topic ?? "your topic";

  switch (intent) {
    case "research":
      return `I'll research the latest skills and trends for "${topicLabel}". The Scout Agent is on it.`;
    case "create_content":
      return `I'm generating learning content for "${topicLabel}". The Content Creator is working on it.`;
    case "assess":
      return `Let's test your knowledge on "${topicLabel}". The Assessment Agent is preparing your quiz.`;
    case "learn":
      return `I'll check your learning path and recommend next steps for "${topicLabel}". The Learning Agent is reviewing your progress.`;
    case "unknown":
      return `I'm not sure what you'd like to do. Try asking me to research a topic, create learning content, take a quiz, or review your learning progress.`;
    default:
      return `Dispatched to ${targetAgent ?? "unknown"}.`;
  }
}

/**
 * Legacy handler for Context Bus AgentMessage format.
 * Bridges the old interface with the new one.
 */
export async function handleMessage(msg: AgentMessage): Promise<void> {
  const userId =
    (msg.payload.user_id as string) ?? "00000000-0000-0000-0000-000000000000";
  const message =
    (msg.payload.raw_input as string) ?? (msg.payload.message as string) ?? "";

  await handleUserMessage({ userId, message });
}

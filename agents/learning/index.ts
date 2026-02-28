import {
  claimMessage,
  completeMessage,
  dispatchMessage,
  failMessage,
} from "@adaptlearn/shared/bus";
import { getSupabaseClient } from "@adaptlearn/shared/db";
import type { AgentMessage, Depth } from "@adaptlearn/shared/types";
import {
  JobDispatchPayloadSchema,
  GapSignalPayloadSchema,
} from "@adaptlearn/shared/types";
import { selectNextContent, updateProgress } from "./sequencer.js";

/**
 * Learning Agent — POC v1
 *
 * Handles two types of messages:
 * 1. JobDispatch (from Master) — user wants learning recommendations
 * 2. GapSignal (from Assessment) — user has knowledge gaps to address
 *
 * Flow:
 * 1. Claim the message
 * 2. Parse payload (JobDispatch or GapSignal)
 * 3. Query user progress and select next content
 * 4. Update user_progress table
 * 5. Dispatch ProgressUpdate to master
 * 6. If assessment needed, dispatch AssessmentTrigger
 */
export async function handleMessage(msg: AgentMessage): Promise<void> {
  const claimed = await claimMessage(msg.id);
  if (!claimed) return;

  try {
    if (msg.message_type === "GapSignal") {
      await handleGapSignal(msg);
    } else {
      await handleJobDispatch(msg);
    }

    await completeMessage(msg.id);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown learning error";
    await failMessage(msg.id, errorMessage);
    throw err;
  }
}

/**
 * Handle a learning request from the user (via Master Agent).
 */
async function handleJobDispatch(msg: AgentMessage): Promise<void> {
  const payload = JobDispatchPayloadSchema.parse(msg.payload);
  const topic = payload.topic ?? "Agentic AI";
  const db = getSupabaseClient();

  // Resolve topic_id
  let topicId = payload.topic_id;
  if (!topicId) {
    const { data: topicRow } = await db
      .from("topics")
      .select("id")
      .ilike("name", `%${topic}%`)
      .eq("is_active", true)
      .limit(1)
      .single();

    topicId = topicRow?.id;
  }

  if (!topicId) {
    throw new Error(`Topic not found in DB: "${topic}"`);
  }

  // Select next content based on progress
  const recommendation = await selectNextContent(payload.user_id, topicId);

  // Update progress to in_progress if we have content
  if (recommendation.nextSkill && recommendation.nextContentItemId) {
    await updateProgress(
      payload.user_id,
      topicId,
      recommendation.nextSkill,
      "in_progress",
      recommendation.nextDepth,
      null,
      recommendation.nextContentItemId
    );
  }

  // Dispatch ProgressUpdate
  await dispatchMessage({
    from_agent: "learning",
    to_agent: "master",
    message_type: "ProgressUpdate",
    payload: {
      user_id: payload.user_id,
      topic,
      topic_id: topicId,
      next_content_item_id: recommendation.nextContentItemId,
      next_skill: recommendation.nextSkill,
      next_depth: recommendation.nextDepth,
      current_status: recommendation.currentStatus,
      message: recommendation.message,
    },
    status: "pending",
  });
}

/**
 * Handle a gap signal from the Assessment Agent.
 * Updates progress to needs_remediation and recommends review content.
 */
async function handleGapSignal(msg: AgentMessage): Promise<void> {
  const payload = GapSignalPayloadSchema.parse(msg.payload);
  const db = getSupabaseClient();

  // Look up the topic_id from the topic name
  const { data: topicRow } = await db
    .from("topics")
    .select("id")
    .ilike("name", `%${payload.topic}%`)
    .eq("is_active", true)
    .limit(1)
    .single();

  const topicId = topicRow?.id;
  if (!topicId) {
    throw new Error(`Topic not found for gap signal: "${payload.topic}"`);
  }

  // Update progress for each gap area
  for (const gap of payload.gaps) {
    const currentDepth: Depth =
      payload.recommendation === "needs_remediation" ? "beginner" : "intermediate";

    await updateProgress(
      payload.user_id,
      topicId,
      gap,
      "needs_remediation",
      currentDepth,
      payload.score,
      null
    );
  }

  // Select remediation content
  const recommendation = await selectNextContent(payload.user_id, topicId);

  // Dispatch ProgressUpdate
  await dispatchMessage({
    from_agent: "learning",
    to_agent: "master",
    message_type: "ProgressUpdate",
    payload: {
      user_id: payload.user_id,
      topic: payload.topic,
      topic_id: topicId,
      next_content_item_id: recommendation.nextContentItemId,
      next_skill: recommendation.nextSkill,
      next_depth: recommendation.nextDepth,
      current_status: "needs_remediation",
      gaps: payload.gaps,
      message: `Gaps identified: ${payload.gaps.join(", ")}. ${recommendation.message}`,
    },
    status: "pending",
  });
}

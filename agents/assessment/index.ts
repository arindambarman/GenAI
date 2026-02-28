import {
  claimMessage,
  completeMessage,
  dispatchMessage,
  failMessage,
} from "@adaptlearn/shared/bus";
import { getSupabaseClient } from "@adaptlearn/shared/db";
import type { AgentMessage } from "@adaptlearn/shared/types";
import { JobDispatchPayloadSchema } from "@adaptlearn/shared/types";
import { scoreAnswers } from "./scorer.js";

/**
 * Assessment Agent — POC v1
 *
 * Receives a JobDispatch, fetches questions from the content item,
 * scores user answers, saves results, and dispatches AssessmentResult + GapSignal.
 *
 * Flow:
 * 1. Claim the message
 * 2. Load the content item's questions from DB
 * 3. Score user answers
 * 4. Save assessment result to assessment_results table
 * 5. Dispatch AssessmentResult to master
 * 6. If gaps found, dispatch GapSignal to learning agent
 * 7. Mark original message as done
 */
export async function handleMessage(msg: AgentMessage): Promise<void> {
  const claimed = await claimMessage(msg.id);
  if (!claimed) return;

  try {
    const payload = JobDispatchPayloadSchema.parse(msg.payload);
    const topic = payload.topic ?? "Agentic AI";
    const db = getSupabaseClient();

    // Load content item with questions
    const contentItemId = payload.content_item_id;
    if (!contentItemId) {
      throw new Error("No content_item_id provided for assessment");
    }

    const { data: contentItem, error: fetchError } = await db
      .from("content_items")
      .select("questions, topic_id")
      .eq("id", contentItemId)
      .single();

    if (fetchError || !contentItem) {
      throw new Error(`Content item not found: ${contentItemId}`);
    }

    const questions = contentItem.questions as Array<{
      q: string;
      options: string[];
      answer: string;
      explanation: string;
    }>;

    // Get user answers from payload
    const userAnswers = (msg.payload.user_answers as string[]) ?? [];

    // Score the answers
    const result = await scoreAnswers(userAnswers, questions, topic);

    // Save to assessment_results
    const { data: savedResult, error: insertError } = await db
      .from("assessment_results")
      .insert({
        user_id: payload.user_id,
        content_item_id: contentItemId,
        topic,
        score: result.score,
        outcome: result.outcome,
        gaps: result.gaps,
        answers: result.answers,
        recommendation: result.recommendation,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to save assessment result: ${insertError.message}`);
    }

    // Dispatch AssessmentResult to master
    await dispatchMessage({
      from_agent: "assessment",
      to_agent: "master",
      message_type: "AssessmentResult",
      payload: {
        user_id: payload.user_id,
        topic,
        score: result.score,
        outcome: result.outcome,
        recommendation: result.recommendation,
        gaps: result.gaps,
        feedback: result.feedback,
        assessment_result_id: savedResult.id,
      },
      status: "pending",
    });

    // If there are gaps, dispatch GapSignal to learning agent
    if (result.gaps.length > 0) {
      await dispatchMessage({
        from_agent: "assessment",
        to_agent: "learning",
        message_type: "GapSignal",
        payload: {
          topic,
          score: result.score,
          outcome: result.outcome,
          gaps: result.gaps,
          recommendation: result.recommendation,
          user_id: payload.user_id,
          assessment_result_id: savedResult.id,
        },
        status: "pending",
      });
    }

    await completeMessage(msg.id);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown assessment error";
    await failMessage(msg.id, errorMessage);
    throw err;
  }
}

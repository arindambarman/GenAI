import {
  claimMessage,
  completeMessage,
  dispatchMessage,
  failMessage,
} from "@adaptlearn/shared/bus";
import { getSupabaseClient } from "@adaptlearn/shared/db";
import type { AgentMessage, Depth } from "@adaptlearn/shared/types";
import { JobDispatchPayloadSchema } from "@adaptlearn/shared/types";
import { generateContent } from "./generator.js";

/**
 * Content Creator Agent — POC v1
 *
 * Receives a JobDispatch message and generates a structured ContentItem:
 * lesson prose, key concepts, MCQs, and flashcards.
 *
 * Flow:
 * 1. Claim the message (pending → processing)
 * 2. Parse the JobDispatch payload
 * 3. Generate content via Claude
 * 4. Save the content item to the content_items table
 * 5. Dispatch a ContentReady message back to the bus
 * 6. Mark the original message as done
 */
export async function handleMessage(msg: AgentMessage): Promise<void> {
  const claimed = await claimMessage(msg.id);
  if (!claimed) return;

  try {
    const payload = JobDispatchPayloadSchema.parse(msg.payload);
    const topic = payload.topic ?? "Agentic AI";
    const depth: Depth = payload.depth ?? "beginner";

    // Determine which skill to generate content for
    // If raw_input mentions a specific skill, use it; otherwise use the topic
    const skill = extractSkill(payload.raw_input, topic);

    // Resolve topic_id
    const db = getSupabaseClient();
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

    // Generate content using Claude
    const content = await generateContent(skill, depth, topic);

    // Save to content_items table
    const { data: savedItem, error: insertError } = await db
      .from("content_items")
      .insert({
        topic_id: topicId,
        skill,
        depth,
        prose: content.prose,
        key_concepts: content.key_concepts,
        questions: content.questions,
        flashcards: content.flashcards,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to save content item: ${insertError.message}`);
    }

    // Dispatch ContentReady message
    await dispatchMessage({
      from_agent: "content_creator",
      to_agent: "master",
      message_type: "ContentReady",
      payload: {
        topic,
        topic_id: topicId,
        skill,
        depth,
        content_item_id: savedItem.id,
        question_count: content.questions.length,
        flashcard_count: content.flashcards.length,
        user_id: payload.user_id,
      },
      status: "pending",
    });

    await completeMessage(msg.id);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown content creator error";
    await failMessage(msg.id, errorMessage);
    throw err;
  }
}

/**
 * Extract a specific skill name from user input.
 * Falls back to the topic name if no skill is explicitly mentioned.
 */
export function extractSkill(rawInput: string, fallbackTopic: string): string {
  // Look for patterns like "lesson on X", "content about X", "teach me X"
  const patterns = [
    /(?:lesson|content|guide)\s+(?:on|about|for)\s+(.+)/i,
    /(?:teach|learn|study)\s+(?:me\s+)?(?:on|about|for)\s+(.+)/i,
    /(?:create|generate|make)\s+(?:a\s+)?(?:lesson|content|guide)\s+(?:on|about|for)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = rawInput.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return fallbackTopic;
}

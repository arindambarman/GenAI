import {
  claimMessage,
  completeMessage,
  dispatchMessage,
  failMessage,
} from "@adaptlearn/shared/bus";
import { getSupabaseClient } from "@adaptlearn/shared/db";
import type { AgentMessage } from "@adaptlearn/shared/types";
import { JobDispatchPayloadSchema } from "@adaptlearn/shared/types";
import { researchTopic } from "./research.js";

/**
 * Scout Agent — POC v1
 *
 * Receives a JobDispatch message, researches the topic using
 * Tavily + Perplexity + Claude, and produces a SkillMap.
 *
 * Flow:
 * 1. Claim the message (pending → processing)
 * 2. Parse the JobDispatch payload
 * 3. Run the research pipeline
 * 4. Save the skill map to the skill_map table
 * 5. Dispatch a SkillMapReady message back to the bus
 * 6. Mark the original message as done
 */
export async function handleMessage(msg: AgentMessage): Promise<void> {
  const claimed = await claimMessage(msg.id);
  if (!claimed) return; // already picked up by another process

  try {
    // Parse and validate the dispatch payload
    const payload = JobDispatchPayloadSchema.parse(msg.payload);
    const topic = payload.topic ?? "Agentic AI";

    // Run the full research pipeline
    const skillMapOutput = await researchTopic(topic);

    // Resolve topic_id — use payload's if available, otherwise look up
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

    // Save skill map to database
    const { data: savedSkillMap, error: insertError } = await db
      .from("skill_map")
      .insert({
        topic_id: topicId,
        skills: skillMapOutput.skills,
        source_summary: skillMapOutput.summary ?? null,
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to save skill map: ${insertError.message}`);
    }

    // Dispatch SkillMapReady to the bus (Content Creator and Learning Agent can pick this up)
    await dispatchMessage({
      from_agent: "scout",
      to_agent: "master",
      message_type: "SkillMapReady",
      payload: {
        topic,
        topic_id: topicId,
        skill_map_id: savedSkillMap.id,
        skill_count: skillMapOutput.skills.length,
        summary: skillMapOutput.summary,
        user_id: payload.user_id,
      },
      status: "pending",
    });

    // Mark the original message as done
    await completeMessage(msg.id);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown scout error";
    await failMessage(msg.id, errorMessage);
    throw err;
  }
}

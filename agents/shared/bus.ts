import { getSupabaseClient } from "./db.js";
import {
  AgentMessageSchema,
  AgentMessageInsertSchema,
  type AgentMessage,
  type AgentMessageInsert,
  type AgentName,
  type MessageStatus,
} from "./types/index.js";

/**
 * Context Bus — the ONLY inter-agent communication channel.
 *
 * All agents dispatch messages by inserting rows into the agent_messages table.
 * Receiving agents poll for messages addressed to them.
 *
 * Rules:
 * - No agent calls another agent's code directly
 * - All payloads are JSON objects
 * - Status lifecycle: pending → processing → done | failed
 */

/**
 * Dispatch a message to another agent via the Context Bus.
 * Returns the inserted message with its generated id.
 */
export async function dispatchMessage(
  msg: AgentMessageInsert
): Promise<AgentMessage> {
  const validated = AgentMessageInsertSchema.parse(msg);
  const db = getSupabaseClient();

  const { data, error } = await db
    .from("agent_messages")
    .insert(validated)
    .select()
    .single();

  if (error) {
    throw new Error(`Context Bus dispatch failed: ${error.message}`);
  }

  return AgentMessageSchema.parse(data);
}

/**
 * Poll for pending messages addressed to a specific agent.
 * Returns messages in creation order (oldest first).
 */
export async function pollMessages(
  toAgent: AgentName,
  limit = 10
): Promise<AgentMessage[]> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from("agent_messages")
    .select()
    .eq("to_agent", toAgent)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Context Bus poll failed: ${error.message}`);
  }

  return (data ?? []).map((row) => AgentMessageSchema.parse(row));
}

/**
 * Claim a message for processing (set status to 'processing').
 * Returns the updated message, or null if already claimed.
 */
export async function claimMessage(
  messageId: string
): Promise<AgentMessage | null> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from("agent_messages")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows matched
    throw new Error(`Context Bus claim failed: ${error.message}`);
  }

  return AgentMessageSchema.parse(data);
}

/**
 * Mark a message as done after successful processing.
 */
export async function completeMessage(messageId: string): Promise<void> {
  await updateMessageStatus(messageId, "done");
}

/**
 * Mark a message as failed with an error description.
 */
export async function failMessage(
  messageId: string,
  errorMessage: string
): Promise<void> {
  const db = getSupabaseClient();

  const { error } = await db
    .from("agent_messages")
    .update({
      status: "failed" as MessageStatus,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) {
    throw new Error(`Context Bus fail update failed: ${error.message}`);
  }
}

/**
 * Internal helper to update message status.
 */
async function updateMessageStatus(
  messageId: string,
  status: MessageStatus
): Promise<void> {
  const db = getSupabaseClient();

  const { error } = await db
    .from("agent_messages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    throw new Error(`Context Bus status update failed: ${error.message}`);
  }
}

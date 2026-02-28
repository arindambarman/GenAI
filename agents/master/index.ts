import type { AgentMessage } from "@adaptlearn/shared/types";

/**
 * Master Agent — POC v1
 *
 * Classifies user intent via Claude Sonnet, dispatches to the correct agent
 * via Context Bus, and drafts the response shown in chat.
 *
 * Implementation: Session 3
 */
export async function handleMessage(_msg: AgentMessage): Promise<void> {
  throw new Error("Master Agent not implemented yet — see Session 3");
}

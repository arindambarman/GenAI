import type { AgentMessage } from "@adaptlearn/shared/types";

/**
 * Assessment Agent — POC v1
 *
 * Generates questions for a topic/ContentItem, scores user responses,
 * identifies knowledge gaps, and signals Master Agent with a GapSignal.
 *
 * Implementation: Session 6
 */
export async function handleMessage(_msg: AgentMessage): Promise<void> {
  throw new Error("Assessment Agent not implemented yet — see Session 6");
}

import type { AgentMessage } from "@adaptlearn/shared/types";

/**
 * Content Creator Agent — POC v1
 *
 * Takes a SkillMap or user request and generates a structured ContentItem:
 * lesson prose, key concepts, MCQs, and flashcards.
 *
 * Implementation: Session 5
 */
export async function handleMessage(_msg: AgentMessage): Promise<void> {
  throw new Error("Content Creator Agent not implemented yet — see Session 5");
}

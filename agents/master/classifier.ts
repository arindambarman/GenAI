import Anthropic from "@anthropic-ai/sdk";
import {
  LLMIntentClassificationSchema,
  type LLMIntentClassification,
} from "@adaptlearn/shared/types";

const SYSTEM_PROMPT = `You are the intent classifier for AdaptLearn, an adaptive learning platform for banking professionals.

Given a user message, classify the intent into exactly one of these categories:
- "research": User wants to explore a topic, find skills in demand, or discover what to learn (triggers Scout Agent)
- "create_content": User wants to generate learning material, lessons, flashcards, or study guides (triggers Content Creator)
- "assess": User wants to take a quiz, test their knowledge, or get assessed (triggers Assessment Agent)
- "learn": User wants to continue their learning path, review progress, or get next steps (triggers Learning Agent)
- "unknown": The message doesn't clearly map to any of the above

Topics covered: Agentic AI, Salesforce Agentforce, AI Strategy (and related banking/fintech AI topics).

Respond with valid JSON only — no markdown, no extra text:
{
  "intent": "<one of: research | create_content | assess | learn | unknown>",
  "topic": "<extracted topic name or null if unclear>",
  "confidence": <0.0 to 1.0>
}`;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  anthropicClient = new Anthropic();
  return anthropicClient;
}

/**
 * Classify user intent using Claude Sonnet.
 * All LLM output is validated with Zod before use.
 */
export async function classifyIntent(
  userMessage: string
): Promise<LLMIntentClassification> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude intent classifier");
  }

  const parsed: unknown = JSON.parse(textBlock.text);
  return LLMIntentClassificationSchema.parse(parsed);
}

/**
 * Overridable for testing — allows injecting a mock Anthropic client.
 */
export function _setAnthropicClient(client: Anthropic | null): void {
  anthropicClient = client;
}

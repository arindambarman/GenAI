import Anthropic from "@anthropic-ai/sdk";
import {
  LLMContentOutputSchema,
  type LLMContentOutput,
  type Depth,
} from "@adaptlearn/shared/types";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  anthropicClient = new Anthropic();
  return anthropicClient;
}

const LESSON_SYSTEM_PROMPT = `You are the Content Creator for AdaptLearn, an adaptive learning platform for banking professionals.

Generate a complete lesson for the given skill and depth level. The lesson must include:
1. "prose" — a clear, well-structured explanation (500-1500 words depending on depth)
2. "key_concepts" — array of 3-7 key takeaways
3. "questions" — array of 3-5 multiple-choice questions for self-assessment
4. "flashcards" — array of 5-8 flashcards for review

Depth levels:
- beginner: Foundational concepts, plain language, real-world analogies
- intermediate: Technical details, practical applications, industry context
- advanced: Expert-level depth, architecture patterns, strategic implications

Each question must have: "q" (question text), "options" (4 choices), "answer" (correct option text), "explanation" (why it's correct).
Each flashcard must have: "front" (question/prompt), "back" (answer/explanation).

Respond with valid JSON only — no markdown, no extra text:
{
  "prose": "<lesson text>",
  "key_concepts": ["<concept1>", "<concept2>", ...],
  "questions": [
    { "q": "<question>", "options": ["A", "B", "C", "D"], "answer": "<correct>", "explanation": "<why>" }
  ],
  "flashcards": [
    { "front": "<prompt>", "back": "<answer>" }
  ]
}`;

/**
 * Generate a full lesson using Claude Sonnet for prose, concepts, and questions.
 * All LLM output is validated with Zod before use.
 */
export async function generateLesson(
  skill: string,
  depth: Depth,
  topic: string
): Promise<LLMContentOutput> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: LESSON_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Topic: ${topic}\nSkill: ${skill}\nDepth: ${depth}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude lesson generator");
  }

  const parsed: unknown = JSON.parse(textBlock.text);
  return LLMContentOutputSchema.parse(parsed);
}

/**
 * Full content generation pipeline.
 * Uses Claude Sonnet for the complete lesson (prose + questions + flashcards).
 */
export async function generateContent(
  skill: string,
  depth: Depth,
  topic: string
): Promise<LLMContentOutput> {
  return generateLesson(skill, depth, topic);
}

/**
 * Overridable for testing — allows injecting a mock Anthropic client.
 */
export function _setAnthropicClient(client: Anthropic | null): void {
  anthropicClient = client;
}

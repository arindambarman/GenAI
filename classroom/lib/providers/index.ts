import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { ProviderId } from "../types";

export interface GenInput {
  system: string;
  user: string;
}

/** Streams text chunks. Falls back to a mock when the provider's key is absent. */
export async function* streamText(provider: ProviderId, input: GenInput): AsyncGenerator<string> {
  if (provider === "claude" && process.env.ANTHROPIC_API_KEY) return yield* claude(input);
  if (provider === "gemini" && process.env.GEMINI_API_KEY) return yield* gemini(input);
  yield* mock(provider, input);
}

async function* claude({ system, user }: GenInput) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = client.messages.stream({
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }],
  });
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
  }
}

async function* gemini({ system, user }: GenInput) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
    contents: user,
    config: { systemInstruction: system, maxOutputTokens: 4000 }, // thinking tokens count against this cap
  });
  for await (const chunk of res) if (chunk.text) yield chunk.text;
}

async function* mock(provider: ProviderId, { user }: GenInput) {
  const text = `[mock ${provider}: add an API key in .env.local for a real answer] I would restate the problem, list assumptions, propose an approach, and say how I would test it. (${user.slice(0, 60)}...)`;
  for (const w of text.split(" ")) {
    yield w + " ";
    await new Promise((r) => setTimeout(r, 20));
  }
}

import Anthropic from "@anthropic-ai/sdk";
import {
  LLMSkillMapOutputSchema,
  type LLMSkillMapOutput,
} from "@adaptlearn/shared/types";
import { parseJsonFromLLM } from "@adaptlearn/shared/llm-json";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Timeout for external API calls (15 seconds). */
const API_TIMEOUT_MS = 15_000;

// ─── External API Clients ───────────────────────────────────────────────────

/**
 * Search the web via Tavily API.
 * Returns raw search result snippets for a given query.
 * Aborts after API_TIMEOUT_MS to prevent hanging.
 */
export async function searchTavily(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return "[Tavily unavailable — no API key]";
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 5,
        include_answer: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return `[Tavily error: ${res.status}]`;
    }

    const data = (await res.json()) as {
      answer?: string;
      results?: Array<{ title: string; content: string; url: string }>;
    };

    const snippets = (data.results ?? [])
      .map((r) => `- ${r.title}: ${r.content}`)
      .join("\n");

    return data.answer
      ? `Answer: ${data.answer}\n\nSources:\n${snippets}`
      : snippets || "[No results]";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return "[Tavily timeout]";
    }
    return `[Tavily error: ${err instanceof Error ? err.message : "unknown"}]`;
  }
}

/**
 * Research a topic via Perplexity API.
 * Returns a synthesized answer with citations.
 * Aborts after API_TIMEOUT_MS to prevent hanging.
 */
export async function searchPerplexity(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return "[Perplexity unavailable — no API key]";
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return `[Perplexity error: ${res.status}]`;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? "[No Perplexity response]";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return "[Perplexity timeout]";
    }
    return `[Perplexity error: ${err instanceof Error ? err.message : "unknown"}]`;
  }
}

/**
 * Check whether a research source returned usable data (not an error/fallback).
 */
function isSourceUsable(result: string): boolean {
  return !result.startsWith("[");
}

// ─── Claude Synthesis ───────────────────────────────────────────────────────

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  anthropicClient = new Anthropic();
  return anthropicClient;
}

const SYNTHESIS_PROMPT = `You are the Scout Agent for AdaptLearn, an adaptive learning platform for banking professionals.

Given research data about a topic, extract a structured skill map. Identify the most important skills that professionals need to learn.

For each skill:
- "skill": A concise skill name
- "demand_score": 0.0 to 1.0 reflecting how in-demand this skill is
- "level": "beginner", "intermediate", or "advanced"

Respond with valid JSON only — no markdown, no extra text:
{
  "topic": "<topic name>",
  "skills": [
    { "skill": "<skill>", "demand_score": <0-1>, "level": "<beginner|intermediate|advanced>" }
  ],
  "summary": "<1-2 sentence summary of the research findings>"
}`;

/**
 * Synthesize research data into a structured skill map using Claude Haiku.
 * All LLM output is validated with Zod before use.
 */
export async function synthesizeSkillMap(
  topic: string,
  researchData: string
): Promise<LLMSkillMapOutput> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYNTHESIS_PROMPT,
    messages: [
      {
        role: "user",
        content: `Topic: ${topic}\n\nResearch Data:\n${researchData}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude skill map synthesis");
  }

  const parsed: unknown = parseJsonFromLLM(textBlock.text);
  return LLMSkillMapOutputSchema.parse(parsed);
}

/**
 * Full research pipeline: Tavily + Perplexity → Claude synthesis → SkillMap.
 * Throws if both external sources fail (no usable data to synthesize from).
 */
export async function researchTopic(topic: string): Promise<LLMSkillMapOutput> {
  const year = new Date().getFullYear();

  // Run Tavily and Perplexity searches in parallel
  const [tavilyResults, perplexityResults] = await Promise.all([
    searchTavily(`${topic} skills in demand for banking professionals ${year}`),
    searchPerplexity(
      `What are the most important ${topic} skills for banking and financial services professionals in ${year}?`
    ),
  ]);

  // Guard: at least one source must return usable data
  if (!isSourceUsable(tavilyResults) && !isSourceUsable(perplexityResults)) {
    throw new Error(
      `Research failed: both sources returned errors — Tavily: ${tavilyResults}, Perplexity: ${perplexityResults}`
    );
  }

  const combinedResearch = [
    "=== Web Search (Tavily) ===",
    tavilyResults,
    "",
    "=== AI Research (Perplexity) ===",
    perplexityResults,
  ].join("\n");

  // Synthesize into a structured skill map
  return synthesizeSkillMap(topic, combinedResearch);
}

/**
 * Overridable for testing — allows injecting a mock Anthropic client.
 */
export function _setAnthropicClient(client: Anthropic | null): void {
  anthropicClient = client;
}

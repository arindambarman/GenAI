import Anthropic from "@anthropic-ai/sdk";
import {
  LLMSkillMapOutputSchema,
  type LLMSkillMapOutput,
} from "@adaptlearn/shared/types";

// ─── External API Clients ───────────────────────────────────────────────────

/**
 * Search the web via Tavily API.
 * Returns raw search result snippets for a given query.
 */
export async function searchTavily(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return "[Tavily unavailable — no API key]";
  }

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
  });

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
}

/**
 * Research a topic via Perplexity API.
 * Returns a synthesized answer with citations.
 */
export async function searchPerplexity(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return "[Perplexity unavailable — no API key]";
  }

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
  });

  if (!res.ok) {
    return `[Perplexity error: ${res.status}]`;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content ?? "[No Perplexity response]";
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

  const parsed: unknown = JSON.parse(textBlock.text);
  return LLMSkillMapOutputSchema.parse(parsed);
}

/**
 * Full research pipeline: Tavily + Perplexity → Claude synthesis → SkillMap
 */
export async function researchTopic(topic: string): Promise<LLMSkillMapOutput> {
  // Run Tavily and Perplexity searches in parallel
  const [tavilyResults, perplexityResults] = await Promise.all([
    searchTavily(`${topic} skills in demand for banking professionals 2026`),
    searchPerplexity(
      `What are the most important ${topic} skills for banking and financial services professionals in 2026?`
    ),
  ]);

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

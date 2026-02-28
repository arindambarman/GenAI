import { describe, it, expect, vi, afterEach } from "vitest";
import {
  searchTavily,
  searchPerplexity,
  synthesizeSkillMap,
  _setAnthropicClient,
} from "./research.js";

describe("searchTavily", () => {
  const originalEnv = process.env.TAVILY_API_KEY;

  afterEach(() => {
    process.env.TAVILY_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns unavailable message when no API key", async () => {
    delete process.env.TAVILY_API_KEY;
    const result = await searchTavily("test query");
    expect(result).toBe("[Tavily unavailable — no API key]");
  });

  it("returns formatted results on success", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "AI agents are transforming banking.",
        results: [
          { title: "Source 1", content: "Agent skills are in demand", url: "https://example.com" },
        ],
      }),
    } as Response);

    const result = await searchTavily("agentic AI banking skills");
    expect(result).toContain("AI agents are transforming banking");
    expect(result).toContain("Source 1");
  });

  it("returns error message on API failure", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await searchTavily("test");
    expect(result).toBe("[Tavily error: 500]");
  });
});

describe("searchPerplexity", () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  afterEach(() => {
    process.env.PERPLEXITY_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns unavailable message when no API key", async () => {
    delete process.env.PERPLEXITY_API_KEY;
    const result = await searchPerplexity("test query");
    expect(result).toBe("[Perplexity unavailable — no API key]");
  });

  it("returns content on success", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Top skills include prompt engineering and RAG." } }],
      }),
    } as Response);

    const result = await searchPerplexity("AI skills for banking");
    expect(result).toContain("prompt engineering");
  });

  it("returns error message on API failure", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    const result = await searchPerplexity("test");
    expect(result).toBe("[Perplexity error: 429]");
  });
});

describe("synthesizeSkillMap", () => {
  afterEach(() => {
    _setAnthropicClient(null);
  });

  it("returns validated skill map from Claude response", async () => {
    const mockResponse = JSON.stringify({
      topic: "Agentic AI",
      skills: [
        { skill: "Prompt Engineering", demand_score: 0.9, level: "intermediate" },
        { skill: "RAG Architecture", demand_score: 0.85, level: "advanced" },
        { skill: "Agent Orchestration", demand_score: 0.8, level: "advanced" },
      ],
      summary: "Agentic AI skills are highly sought after in banking.",
    });

    const mock = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: mockResponse }],
        }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    _setAnthropicClient(mock);

    const result = await synthesizeSkillMap("Agentic AI", "some research data");

    expect(result.topic).toBe("Agentic AI");
    expect(result.skills).toHaveLength(3);
    expect(result.skills[0].skill).toBe("Prompt Engineering");
    expect(result.skills[0].demand_score).toBe(0.9);
    expect(result.summary).toContain("banking");
  });

  it("throws on invalid LLM output", async () => {
    const mock = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify({ topic: "AI", skills: [] }) }],
        }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    _setAnthropicClient(mock);

    // skills array must have at least 1 entry
    await expect(synthesizeSkillMap("AI", "data")).rejects.toThrow();
  });

  it("throws when LLM returns no text", async () => {
    const mock = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    _setAnthropicClient(mock);

    await expect(synthesizeSkillMap("AI", "data")).rejects.toThrow(
      "No text response from Claude skill map synthesis"
    );
  });
});

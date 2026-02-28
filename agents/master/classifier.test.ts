import { describe, it, expect, vi, afterEach } from "vitest";
import { classifyIntent, _setAnthropicClient } from "./classifier.js";

/**
 * Creates a mock Anthropic client that returns the given JSON string.
 */
function mockAnthropicWithResponse(jsonText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: jsonText }],
      }),
    },
  } as unknown as import("@anthropic-ai/sdk").default;
}

describe("classifyIntent", () => {
  afterEach(() => {
    _setAnthropicClient(null);
  });

  it("classifies a research intent correctly", async () => {
    const mock = mockAnthropicWithResponse(
      JSON.stringify({
        intent: "research",
        topic: "Agentic AI",
        confidence: 0.95,
      })
    );
    _setAnthropicClient(mock);

    const result = await classifyIntent("What are the top skills for Agentic AI?");

    expect(result.intent).toBe("research");
    expect(result.topic).toBe("Agentic AI");
    expect(result.confidence).toBe(0.95);
    expect(mock.messages.create).toHaveBeenCalledOnce();
  });

  it("classifies a create_content intent correctly", async () => {
    const mock = mockAnthropicWithResponse(
      JSON.stringify({
        intent: "create_content",
        topic: "Salesforce Agentforce",
        confidence: 0.88,
      })
    );
    _setAnthropicClient(mock);

    const result = await classifyIntent(
      "Create a lesson on Salesforce Agentforce for beginners"
    );

    expect(result.intent).toBe("create_content");
    expect(result.topic).toBe("Salesforce Agentforce");
    expect(result.confidence).toBe(0.88);
  });

  it("classifies an assess intent correctly", async () => {
    const mock = mockAnthropicWithResponse(
      JSON.stringify({
        intent: "assess",
        topic: "AI Strategy",
        confidence: 0.92,
      })
    );
    _setAnthropicClient(mock);

    const result = await classifyIntent("Quiz me on AI Strategy");

    expect(result.intent).toBe("assess");
    expect(result.topic).toBe("AI Strategy");
  });

  it("classifies a learn intent correctly", async () => {
    const mock = mockAnthropicWithResponse(
      JSON.stringify({
        intent: "learn",
        topic: "Agentic AI",
        confidence: 0.85,
      })
    );
    _setAnthropicClient(mock);

    const result = await classifyIntent("What should I study next for Agentic AI?");

    expect(result.intent).toBe("learn");
  });

  it("classifies unknown intent for off-topic messages", async () => {
    const mock = mockAnthropicWithResponse(
      JSON.stringify({
        intent: "unknown",
        confidence: 0.3,
      })
    );
    _setAnthropicClient(mock);

    const result = await classifyIntent("What's the weather today?");

    expect(result.intent).toBe("unknown");
    expect(result.confidence).toBe(0.3);
    expect(result.topic).toBeUndefined();
  });

  it("throws on invalid LLM output (Zod validation)", async () => {
    const mock = mockAnthropicWithResponse(
      JSON.stringify({
        intent: "invalid_intent",
        confidence: 0.5,
      })
    );
    _setAnthropicClient(mock);

    await expect(classifyIntent("hello")).rejects.toThrow();
  });

  it("throws when LLM returns no text content", async () => {
    const mock = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [],
        }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    _setAnthropicClient(mock);

    await expect(classifyIntent("hello")).rejects.toThrow(
      "No text response from Claude intent classifier"
    );
  });

  it("throws when LLM returns invalid JSON", async () => {
    const mock = mockAnthropicWithResponse("not json at all");
    _setAnthropicClient(mock);

    await expect(classifyIntent("hello")).rejects.toThrow();
  });
});

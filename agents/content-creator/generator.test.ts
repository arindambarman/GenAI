import { describe, it, expect, vi, afterEach } from "vitest";
import { generateLesson, _setAnthropicClient } from "./generator.js";

const VALID_LESSON = {
  prose: "Agentic AI refers to autonomous AI systems that can plan and act independently.",
  key_concepts: ["Autonomy", "Planning", "Tool Use"],
  questions: [
    {
      q: "What is a key characteristic of agentic AI?",
      options: ["Autonomy", "Speed", "Size", "Cost"],
      answer: "Autonomy",
      explanation: "Agentic AI systems are defined by their ability to act autonomously.",
    },
  ],
  flashcards: [
    { front: "What is agentic AI?", back: "AI systems that autonomously plan, reason, and act." },
  ],
};

function mockAnthropicWithResponse(jsonText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: jsonText }],
      }),
    },
  } as unknown as import("@anthropic-ai/sdk").default;
}

describe("generateLesson", () => {
  afterEach(() => {
    _setAnthropicClient(null);
  });

  it("generates and validates a lesson", async () => {
    const mock = mockAnthropicWithResponse(JSON.stringify(VALID_LESSON));
    _setAnthropicClient(mock);

    const result = await generateLesson("Prompt Engineering", "beginner", "Agentic AI");

    expect(result.prose).toContain("Agentic AI");
    expect(result.key_concepts).toHaveLength(3);
    expect(result.questions).toHaveLength(1);
    expect(result.flashcards).toHaveLength(1);
    expect(result.questions[0].answer).toBe("Autonomy");

    // Verify the correct model was used
    expect(mock.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" })
    );
  });

  it("throws on invalid LLM output (missing required fields)", async () => {
    const mock = mockAnthropicWithResponse(
      JSON.stringify({ prose: "Some text", key_concepts: [] })
    );
    _setAnthropicClient(mock);

    await expect(generateLesson("X", "beginner", "Y")).rejects.toThrow();
  });

  it("throws when LLM returns no text", async () => {
    const mock = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    _setAnthropicClient(mock);

    await expect(generateLesson("X", "beginner", "Y")).rejects.toThrow(
      "No text response from Claude lesson generator"
    );
  });

  it("throws on invalid JSON from LLM", async () => {
    const mock = mockAnthropicWithResponse("not json");
    _setAnthropicClient(mock);

    await expect(generateLesson("X", "beginner", "Y")).rejects.toThrow();
  });
});

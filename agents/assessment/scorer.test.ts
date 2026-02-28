import { describe, it, expect, vi, afterEach } from "vitest";
import {
  scoreMCQ,
  determineOutcome,
  determineRecommendation,
  analyzeGaps,
  _setAnthropicClient,
} from "./scorer.js";
import type { Question } from "@adaptlearn/shared/types";

const SAMPLE_QUESTIONS: Question[] = [
  {
    q: "What is agentic AI?",
    options: ["Autonomous AI", "Manual AI", "Static AI", "None"],
    answer: "Autonomous AI",
    explanation: "Agentic AI acts autonomously.",
  },
  {
    q: "What is RAG?",
    options: ["Retrieval Augmented Generation", "Random Access Gate", "Run All GPU", "None"],
    answer: "Retrieval Augmented Generation",
    explanation: "RAG combines retrieval with generation.",
  },
  {
    q: "What is a prompt?",
    options: ["Input to LLM", "A database", "A server", "A framework"],
    answer: "Input to LLM",
    explanation: "Prompts are inputs that guide LLM behavior.",
  },
];

describe("scoreMCQ", () => {
  it("scores all correct answers as 1.0", () => {
    const { answers, score } = scoreMCQ(
      ["Autonomous AI", "Retrieval Augmented Generation", "Input to LLM"],
      SAMPLE_QUESTIONS
    );

    expect(score).toBe(1);
    expect(answers).toHaveLength(3);
    expect(answers.every((a) => a.correct)).toBe(true);
  });

  it("scores all wrong answers as 0.0", () => {
    const { answers, score } = scoreMCQ(
      ["Manual AI", "Random Access Gate", "A database"],
      SAMPLE_QUESTIONS
    );

    expect(score).toBe(0);
    expect(answers.every((a) => !a.correct)).toBe(true);
  });

  it("scores partial correct answers proportionally", () => {
    const { score } = scoreMCQ(
      ["Autonomous AI", "Random Access Gate", "Input to LLM"],
      SAMPLE_QUESTIONS
    );

    expect(score).toBeCloseTo(2 / 3);
  });

  it("handles empty answers", () => {
    const { answers, score } = scoreMCQ([], SAMPLE_QUESTIONS);

    expect(score).toBe(0);
    expect(answers).toHaveLength(0);
  });

  it("handles empty questions", () => {
    const { score } = scoreMCQ([], []);
    expect(score).toBe(0);
  });
});

describe("determineOutcome", () => {
  it("returns PASS for score >= 0.8", () => {
    expect(determineOutcome(1.0)).toBe("PASS");
    expect(determineOutcome(0.8)).toBe("PASS");
  });

  it("returns PARTIAL for score >= 0.5 and < 0.8", () => {
    expect(determineOutcome(0.7)).toBe("PARTIAL");
    expect(determineOutcome(0.5)).toBe("PARTIAL");
  });

  it("returns FAIL for score < 0.5", () => {
    expect(determineOutcome(0.49)).toBe("FAIL");
    expect(determineOutcome(0)).toBe("FAIL");
  });
});

describe("determineRecommendation", () => {
  it("returns advance for PASS", () => {
    expect(determineRecommendation("PASS")).toBe("advance");
  });

  it("returns needs_review for PARTIAL", () => {
    expect(determineRecommendation("PARTIAL")).toBe("needs_review");
  });

  it("returns needs_remediation for FAIL", () => {
    expect(determineRecommendation("FAIL")).toBe("needs_remediation");
  });
});

describe("analyzeGaps", () => {
  afterEach(() => {
    _setAnthropicClient(null);
  });

  it("returns validated gap analysis from Claude", async () => {
    const mockResponse = JSON.stringify({
      score: 0.33,
      outcome: "FAIL",
      gaps: ["RAG Architecture", "Prompt Design"],
      recommendation: "needs_remediation",
      feedback: "Focus on RAG concepts and prompt engineering fundamentals.",
    });

    const mock = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: mockResponse }],
        }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    _setAnthropicClient(mock);

    const answers = [
      { question_index: 0, user_answer: "Autonomous AI", correct: true },
      { question_index: 1, user_answer: "Wrong", correct: false },
      { question_index: 2, user_answer: "Wrong", correct: false },
    ];

    const result = await analyzeGaps(SAMPLE_QUESTIONS, answers, 0.33, "Agentic AI");

    expect(result.gaps).toHaveLength(2);
    expect(result.recommendation).toBe("needs_remediation");
    expect(result.feedback).toContain("RAG");
  });

  it("throws on invalid LLM output", async () => {
    const mock = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify({ score: "invalid" }) }],
        }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    _setAnthropicClient(mock);

    await expect(
      analyzeGaps(SAMPLE_QUESTIONS, [], 0, "AI")
    ).rejects.toThrow();
  });
});

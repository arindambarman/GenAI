import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./generator.js", () => ({
  generateContent: vi.fn(),
}));

vi.mock("@adaptlearn/shared/bus", () => ({
  claimMessage: vi.fn(),
  completeMessage: vi.fn(),
  dispatchMessage: vi.fn(),
  failMessage: vi.fn(),
}));

vi.mock("@adaptlearn/shared/db", () => ({
  getSupabaseClient: vi.fn(),
}));

import { handleMessage, extractSkill } from "./index.js";
import { generateContent } from "./generator.js";
import {
  claimMessage,
  completeMessage,
  dispatchMessage,
  failMessage,
} from "@adaptlearn/shared/bus";
import { getSupabaseClient } from "@adaptlearn/shared/db";
import type { AgentMessage } from "@adaptlearn/shared/types";

const TOPIC_UUID = "00000000-0000-0000-0000-000000000001";
const USER_UUID = "00000000-0000-0000-0000-000000000002";

function makeMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "msg-001",
    from_agent: "master",
    to_agent: "content_creator",
    message_type: "JobDispatch",
    payload: {
      intent: "create_content",
      topic: "Agentic AI",
      topic_id: TOPIC_UUID,
      user_id: USER_UUID,
      depth: "beginner",
      raw_input: "Create a lesson on Prompt Engineering",
    },
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockDb() {
  const mockSingle = vi.fn();
  const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEqActive = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockIlike = vi.fn().mockReturnValue({ eq: mockEqActive });
  const mockSelect = vi.fn().mockImplementation(() => ({ ilike: mockIlike, single: mockSingle }));
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    from: vi.fn().mockImplementation(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
    _mockSingle: mockSingle,
  };
}

describe("Content Creator handleMessage", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);
  });

  it("generates content and dispatches ContentReady", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));

    vi.mocked(generateContent).mockResolvedValue({
      prose: "Lesson about prompt engineering...",
      key_concepts: ["Clarity", "Context", "Constraints"],
      questions: [
        {
          q: "What matters in prompts?",
          options: ["Clarity", "Length", "Font", "Color"],
          answer: "Clarity",
          explanation: "Clear prompts produce better results.",
        },
      ],
      flashcards: [
        { front: "What is prompt engineering?", back: "Designing effective prompts for LLMs." },
      ],
    });

    mockDb._mockSingle.mockReturnValue({
      data: { id: "content-uuid-789" },
      error: null,
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "reply-msg-001",
      from_agent: "content_creator",
      to_agent: "master",
      message_type: "ContentReady",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await handleMessage(makeMessage());

    expect(generateContent).toHaveBeenCalledWith(
      "Prompt Engineering",
      "beginner",
      "Agentic AI"
    );

    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from_agent: "content_creator",
        to_agent: "master",
        message_type: "ContentReady",
        payload: expect.objectContaining({
          topic: "Agentic AI",
          skill: "Prompt Engineering",
          depth: "beginner",
          content_item_id: "content-uuid-789",
          question_count: 1,
          flashcard_count: 1,
        }),
      })
    );

    expect(completeMessage).toHaveBeenCalledWith("msg-001");
  });

  it("skips if message is already claimed", async () => {
    vi.mocked(claimMessage).mockResolvedValue(null);

    await handleMessage(makeMessage());

    expect(generateContent).not.toHaveBeenCalled();
    expect(dispatchMessage).not.toHaveBeenCalled();
  });

  it("fails the message on generation error", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));
    vi.mocked(generateContent).mockRejectedValue(new Error("LLM rate limited"));

    await expect(handleMessage(makeMessage())).rejects.toThrow("LLM rate limited");

    expect(failMessage).toHaveBeenCalledWith("msg-001", "LLM rate limited");
    expect(completeMessage).not.toHaveBeenCalled();
  });
});

describe("extractSkill", () => {
  it("extracts skill from 'lesson on X' pattern", () => {
    expect(extractSkill("Create a lesson on Prompt Engineering", "AI")).toBe("Prompt Engineering");
  });

  it("extracts skill from 'content about X' pattern", () => {
    expect(extractSkill("Generate content about RAG Architecture", "AI")).toBe("RAG Architecture");
  });

  it("extracts skill from 'teach me X' pattern", () => {
    expect(extractSkill("Teach me about Agent Orchestration", "AI")).toBe("Agent Orchestration");
  });

  it("falls back to topic when no pattern matches", () => {
    expect(extractSkill("I want to learn more", "Agentic AI")).toBe("Agentic AI");
  });
});

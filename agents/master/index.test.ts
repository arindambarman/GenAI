import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the classifier
vi.mock("./classifier.js", () => ({
  classifyIntent: vi.fn(),
}));

// Mock the Context Bus
vi.mock("@adaptlearn/shared/bus", () => ({
  dispatchMessage: vi.fn(),
}));

// Mock the DB client
vi.mock("@adaptlearn/shared/db", () => ({
  getSupabaseClient: vi.fn(),
}));

import { handleUserMessage } from "./index.js";
import { classifyIntent } from "./classifier.js";
import { dispatchMessage } from "@adaptlearn/shared/bus";
import { getSupabaseClient } from "@adaptlearn/shared/db";

function createMockDb() {
  const mockInsert = vi.fn().mockReturnValue({ error: null });
  const mockSingle = vi.fn().mockReturnValue({ data: null, error: null });
  const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockIlike = vi.fn().mockReturnValue({ eq: mockEq });
  const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "topics") {
        return { select: mockSelect };
      }
      // master_agent_log
      return { insert: mockInsert };
    }),
    _mockSingle: mockSingle,
    _mockInsert: mockInsert,
  };
}

describe("handleUserMessage", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);
  });

  it("dispatches research intent to scout agent", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "research",
      topic: "Agentic AI",
      confidence: 0.95,
    });

    mockDb._mockSingle.mockReturnValue({
      data: { id: "topic-uuid-123" },
      error: null,
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "msg-uuid-456",
      from_agent: "master",
      to_agent: "scout",
      message_type: "JobDispatch",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await handleUserMessage({
      userId: "00000000-0000-0000-0000-000000000001",
      message: "What are the top skills for Agentic AI?",
    });

    expect(result.intent).toBe("research");
    expect(result.dispatchedTo).toBe("scout");
    expect(result.agentMessageId).toBe("msg-uuid-456");
    expect(result.response).toContain("Scout Agent");

    // Verify dispatch was called with correct payload
    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from_agent: "master",
        to_agent: "scout",
        message_type: "JobDispatch",
        status: "pending",
        payload: expect.objectContaining({
          intent: "research",
          topic: "Agentic AI",
          topic_id: "topic-uuid-123",
          user_id: "00000000-0000-0000-0000-000000000001",
        }),
      })
    );

    // Verify logging
    expect(mockDb.from).toHaveBeenCalledWith("master_agent_log");
  });

  it("dispatches create_content intent to content_creator", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "create_content",
      topic: "AI Strategy",
      confidence: 0.9,
    });

    mockDb._mockSingle.mockReturnValue({ data: null, error: null });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "msg-uuid-789",
      from_agent: "master",
      to_agent: "content_creator",
      message_type: "JobDispatch",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await handleUserMessage({
      userId: "00000000-0000-0000-0000-000000000001",
      message: "Create a lesson on AI Strategy",
    });

    expect(result.intent).toBe("create_content");
    expect(result.dispatchedTo).toBe("content_creator");
    expect(result.response).toContain("Content Creator");
  });

  it("dispatches assess intent to assessment agent", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "assess",
      topic: "Salesforce Agentforce",
      confidence: 0.92,
    });

    mockDb._mockSingle.mockReturnValue({ data: null, error: null });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "msg-uuid-abc",
      from_agent: "master",
      to_agent: "assessment",
      message_type: "JobDispatch",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await handleUserMessage({
      userId: "00000000-0000-0000-0000-000000000001",
      message: "Quiz me on Salesforce Agentforce",
    });

    expect(result.intent).toBe("assess");
    expect(result.dispatchedTo).toBe("assessment");
    expect(result.response).toContain("Assessment Agent");
  });

  it("dispatches learn intent to learning agent", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "learn",
      topic: "Agentic AI",
      confidence: 0.85,
    });

    mockDb._mockSingle.mockReturnValue({ data: null, error: null });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "msg-uuid-def",
      from_agent: "master",
      to_agent: "learning",
      message_type: "JobDispatch",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await handleUserMessage({
      userId: "00000000-0000-0000-0000-000000000001",
      message: "What should I study next?",
    });

    expect(result.intent).toBe("learn");
    expect(result.dispatchedTo).toBe("learning");
    expect(result.response).toContain("Learning Agent");
  });

  it("does not dispatch for unknown intent", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "unknown",
      confidence: 0.3,
    });

    const result = await handleUserMessage({
      userId: "00000000-0000-0000-0000-000000000001",
      message: "What's the weather?",
    });

    expect(result.intent).toBe("unknown");
    expect(result.dispatchedTo).toBeNull();
    expect(result.agentMessageId).toBeNull();
    expect(dispatchMessage).not.toHaveBeenCalled();
    expect(result.response).toContain("not sure");
  });

  it("handles missing topic gracefully", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "research",
      confidence: 0.7,
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "msg-uuid-ghi",
      from_agent: "master",
      to_agent: "scout",
      message_type: "JobDispatch",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await handleUserMessage({
      userId: "00000000-0000-0000-0000-000000000001",
      message: "Tell me about trending skills",
    });

    expect(result.intent).toBe("research");
    expect(result.topic).toBeUndefined();
    expect(result.dispatchedTo).toBe("scout");
  });
});

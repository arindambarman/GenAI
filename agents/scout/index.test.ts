import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./research.js", () => ({
  researchTopic: vi.fn(),
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

import { handleMessage } from "./index.js";
import { researchTopic } from "./research.js";
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
    to_agent: "scout",
    message_type: "JobDispatch",
    payload: {
      intent: "research",
      topic: "Agentic AI",
      topic_id: TOPIC_UUID,
      user_id: USER_UUID,
      raw_input: "Research Agentic AI skills",
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
    _mockInsert: mockInsert,
  };
}

describe("Scout Agent handleMessage", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);
  });

  it("processes a JobDispatch and produces SkillMapReady", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));

    vi.mocked(researchTopic).mockResolvedValue({
      topic: "Agentic AI",
      skills: [
        { skill: "Prompt Engineering", demand_score: 0.9, level: "intermediate" },
        { skill: "RAG Architecture", demand_score: 0.85, level: "advanced" },
      ],
      summary: "Key skills for banking AI agents.",
    });

    // skill_map insert returns an id
    mockDb._mockSingle.mockReturnValue({
      data: { id: "skillmap-uuid-789" },
      error: null,
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "reply-msg-001",
      from_agent: "scout",
      to_agent: "master",
      message_type: "SkillMapReady",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await handleMessage(makeMessage());

    // Verify research was called with the topic
    expect(researchTopic).toHaveBeenCalledWith("Agentic AI");

    // Verify SkillMapReady was dispatched
    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from_agent: "scout",
        to_agent: "master",
        message_type: "SkillMapReady",
        payload: expect.objectContaining({
          topic: "Agentic AI",
          topic_id: TOPIC_UUID,
          skill_map_id: "skillmap-uuid-789",
          skill_count: 2,
        }),
      })
    );

    // Verify original message was completed
    expect(completeMessage).toHaveBeenCalledWith("msg-001");
  });

  it("skips if message is already claimed", async () => {
    vi.mocked(claimMessage).mockResolvedValue(null);

    await handleMessage(makeMessage());

    expect(researchTopic).not.toHaveBeenCalled();
    expect(dispatchMessage).not.toHaveBeenCalled();
  });

  it("fails the message on research error", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));
    vi.mocked(researchTopic).mockRejectedValue(new Error("API timeout"));

    await expect(handleMessage(makeMessage())).rejects.toThrow("API timeout");

    expect(failMessage).toHaveBeenCalledWith("msg-001", "API timeout");
    expect(completeMessage).not.toHaveBeenCalled();
  });

  it("fails the message when topic not found in DB", async () => {
    const msgWithoutTopicId = makeMessage({
      payload: {
        intent: "research",
        topic: "Unknown Topic",
        user_id: USER_UUID,
        raw_input: "Research unknown",
      },
    });

    vi.mocked(claimMessage).mockResolvedValue({ ...msgWithoutTopicId, status: "processing" });

    vi.mocked(researchTopic).mockResolvedValue({
      topic: "Unknown Topic",
      skills: [{ skill: "Test", demand_score: 0.5, level: "beginner" }],
    });

    // Topic lookup returns nothing
    mockDb._mockSingle.mockReturnValue({ data: null, error: null });

    await expect(handleMessage(msgWithoutTopicId)).rejects.toThrow(
      'Topic not found in DB: "Unknown Topic"'
    );

    expect(failMessage).toHaveBeenCalledWith(
      "msg-001",
      'Topic not found in DB: "Unknown Topic"'
    );
  });
});

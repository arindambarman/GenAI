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

/**
 * Build a chainable Supabase mock.
 * singleResults is a queue — each .single() call pops the next value.
 */
function createMockDb(singleResults: Array<{ data: unknown; error: unknown }>) {
  let singleIdx = 0;
  const mockSingle = vi.fn().mockImplementation(() => singleResults[singleIdx++]);
  const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
  const mockEqActive = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockEq = vi.fn().mockImplementation(() => ({ gte: mockGte, limit: mockLimit }));
  const mockIlike = vi.fn().mockReturnValue({ eq: mockEqActive });
  const mockSelect = vi.fn().mockImplementation(() => ({
    ilike: mockIlike,
    single: mockSingle,
    eq: mockEq,
  }));
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    from: vi.fn().mockImplementation(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
  };
}

describe("Scout Agent handleMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a JobDispatch and produces SkillMapReady", async () => {
    // Queue: [cache miss, insert success]
    const mockDb = createMockDb([
      { data: null, error: null },                     // cache miss
      { data: { id: "skillmap-uuid-789" }, error: null }, // insert
    ]);
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);

    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));

    vi.mocked(researchTopic).mockResolvedValue({
      topic: "Agentic AI",
      skills: [
        { skill: "Prompt Engineering", demand_score: 0.9, level: "intermediate" },
        { skill: "RAG Architecture", demand_score: 0.85, level: "advanced" },
      ],
      summary: "Key skills for banking AI agents.",
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

    expect(researchTopic).toHaveBeenCalledWith("Agentic AI");

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

    expect(completeMessage).toHaveBeenCalledWith("msg-001");
  });

  it("skips if message is already claimed", async () => {
    vi.mocked(claimMessage).mockResolvedValue(null);

    await handleMessage(makeMessage());

    expect(researchTopic).not.toHaveBeenCalled();
    expect(dispatchMessage).not.toHaveBeenCalled();
  });

  it("fails the message on research error", async () => {
    const mockDb = createMockDb([
      { data: null, error: null }, // cache miss
    ]);
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);

    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));
    vi.mocked(researchTopic).mockRejectedValue(new Error("API timeout"));

    await expect(handleMessage(makeMessage())).rejects.toThrow("API timeout");

    expect(failMessage).toHaveBeenCalledWith("msg-001", "API timeout");
    expect(completeMessage).not.toHaveBeenCalled();
  });

  it("fails the message when topic not found in DB", async () => {
    const mockDb = createMockDb([
      { data: null, error: null }, // topic lookup returns nothing
    ]);
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);

    const msgWithoutTopicId = makeMessage({
      payload: {
        intent: "research",
        topic: "Unknown Topic",
        user_id: USER_UUID,
        raw_input: "Research unknown",
      },
    });

    vi.mocked(claimMessage).mockResolvedValue({ ...msgWithoutTopicId, status: "processing" });

    await expect(handleMessage(msgWithoutTopicId)).rejects.toThrow(
      'Topic not found in DB: "Unknown Topic"'
    );

    expect(failMessage).toHaveBeenCalledWith(
      "msg-001",
      'Topic not found in DB: "Unknown Topic"'
    );
  });

  it("returns cached skill map without calling researchTopic", async () => {
    const cachedData = {
      id: "cached-skillmap-id",
      skills: [{ skill: "Cached Skill", demand_score: 0.8, level: "intermediate" }],
      source_summary: "Cached summary",
    };

    const mockDb = createMockDb([
      { data: cachedData, error: null }, // cache hit
    ]);
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);

    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "reply-msg-002",
      from_agent: "scout",
      to_agent: "master",
      message_type: "SkillMapReady",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await handleMessage(makeMessage());

    // Research should NOT be called — cache was used
    expect(researchTopic).not.toHaveBeenCalled();

    // SkillMapReady should be dispatched with cached data
    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from_agent: "scout",
        to_agent: "master",
        message_type: "SkillMapReady",
        payload: expect.objectContaining({
          skill_map_id: "cached-skillmap-id",
          cached: true,
        }),
      })
    );

    expect(completeMessage).toHaveBeenCalledWith("msg-001");
  });
});

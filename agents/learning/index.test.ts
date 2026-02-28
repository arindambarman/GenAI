import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./sequencer.js", () => ({
  selectNextContent: vi.fn(),
  updateProgress: vi.fn(),
  getNextDepth: vi.fn(),
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
import { selectNextContent, updateProgress } from "./sequencer.js";
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
const ASSESSMENT_UUID = "00000000-0000-0000-0000-000000000004";

function makeJobDispatch(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "msg-001",
    from_agent: "master",
    to_agent: "learning",
    message_type: "JobDispatch",
    payload: {
      intent: "learn",
      topic: "Agentic AI",
      topic_id: TOPIC_UUID,
      user_id: USER_UUID,
      raw_input: "What should I learn next?",
    },
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeGapSignal(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "msg-002",
    from_agent: "assessment",
    to_agent: "learning",
    message_type: "GapSignal",
    payload: {
      topic: "Agentic AI",
      score: 0.4,
      outcome: "FAIL",
      gaps: ["RAG Architecture", "Agent Orchestration"],
      recommendation: "needs_remediation",
      user_id: USER_UUID,
      assessment_result_id: ASSESSMENT_UUID,
    },
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockDb() {
  const mockSingle = vi.fn().mockReturnValue({ data: { id: TOPIC_UUID }, error: null });
  const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEqActive = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockIlike = vi.fn().mockReturnValue({ eq: mockEqActive });
  const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike });

  return {
    from: vi.fn().mockReturnValue({ select: mockSelect }),
    _mockSingle: mockSingle,
  };
}

describe("Learning Agent handleMessage", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);
  });

  it("handles JobDispatch and dispatches ProgressUpdate", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeJobDispatch({ status: "processing" }));

    vi.mocked(selectNextContent).mockResolvedValue({
      nextContentItemId: "content-uuid-001",
      nextSkill: "Prompt Engineering",
      nextDepth: "beginner",
      currentStatus: "not_started",
      message: 'Start learning "Prompt Engineering" from the basics.',
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "reply-001",
      from_agent: "learning",
      to_agent: "master",
      message_type: "ProgressUpdate",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await handleMessage(makeJobDispatch());

    expect(selectNextContent).toHaveBeenCalledWith(USER_UUID, TOPIC_UUID);
    expect(updateProgress).toHaveBeenCalledWith(
      USER_UUID, TOPIC_UUID, "Prompt Engineering", "in_progress", "beginner", null, "content-uuid-001"
    );

    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from_agent: "learning",
        to_agent: "master",
        message_type: "ProgressUpdate",
        payload: expect.objectContaining({
          next_skill: "Prompt Engineering",
          next_depth: "beginner",
        }),
      })
    );

    expect(completeMessage).toHaveBeenCalledWith("msg-001");
  });

  it("handles GapSignal and updates remediation progress", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeGapSignal({ status: "processing" }));

    vi.mocked(selectNextContent).mockResolvedValue({
      nextContentItemId: "content-uuid-002",
      nextSkill: "RAG Architecture",
      nextDepth: "beginner",
      currentStatus: "needs_remediation",
      message: 'Let\'s review "RAG Architecture".',
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "reply-002",
      from_agent: "learning",
      to_agent: "master",
      message_type: "ProgressUpdate",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await handleMessage(makeGapSignal());

    // Should update progress for each gap
    expect(updateProgress).toHaveBeenCalledTimes(2);
    expect(updateProgress).toHaveBeenCalledWith(
      USER_UUID, TOPIC_UUID, "RAG Architecture", "needs_remediation", "beginner", 0.4, null
    );
    expect(updateProgress).toHaveBeenCalledWith(
      USER_UUID, TOPIC_UUID, "Agent Orchestration", "needs_remediation", "beginner", 0.4, null
    );

    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message_type: "ProgressUpdate",
        payload: expect.objectContaining({
          gaps: ["RAG Architecture", "Agent Orchestration"],
          current_status: "needs_remediation",
        }),
      })
    );

    expect(completeMessage).toHaveBeenCalledWith("msg-002");
  });

  it("skips if already claimed", async () => {
    vi.mocked(claimMessage).mockResolvedValue(null);
    await handleMessage(makeJobDispatch());
    expect(selectNextContent).not.toHaveBeenCalled();
  });

  it("fails the message on error", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeJobDispatch({ status: "processing" }));
    vi.mocked(selectNextContent).mockRejectedValue(new Error("DB connection lost"));

    await expect(handleMessage(makeJobDispatch())).rejects.toThrow("DB connection lost");
    expect(failMessage).toHaveBeenCalledWith("msg-001", "DB connection lost");
  });
});

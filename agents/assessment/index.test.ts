import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./scorer.js", () => ({
  scoreAnswers: vi.fn(),
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
import { scoreAnswers } from "./scorer.js";
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
const CONTENT_UUID = "00000000-0000-0000-0000-000000000003";

function makeMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "msg-001",
    from_agent: "master",
    to_agent: "assessment",
    message_type: "JobDispatch",
    payload: {
      intent: "assess",
      topic: "Agentic AI",
      topic_id: TOPIC_UUID,
      user_id: USER_UUID,
      content_item_id: CONTENT_UUID,
      raw_input: "Quiz me on Agentic AI",
      user_answers: ["Autonomous AI", "Wrong Answer"],
    },
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockDb() {
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockImplementation(() => ({ eq: mockEq, single: mockSingle }));
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    from: vi.fn().mockImplementation(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
    _mockSingle: mockSingle,
  };
}

describe("Assessment Agent handleMessage", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);
  });

  it("scores answers and dispatches AssessmentResult + GapSignal", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));

    // DB returns content item with questions
    mockDb._mockSingle
      .mockReturnValueOnce({
        data: {
          questions: [
            { q: "Q1", options: ["A", "B"], answer: "A", explanation: "Because A" },
            { q: "Q2", options: ["C", "D"], answer: "C", explanation: "Because C" },
          ],
          topic_id: TOPIC_UUID,
        },
        error: null,
      })
      // assessment_results insert
      .mockReturnValueOnce({
        data: { id: "result-uuid-001" },
        error: null,
      });

    vi.mocked(scoreAnswers).mockResolvedValue({
      answers: [
        { question_index: 0, user_answer: "A", correct: true },
        { question_index: 1, user_answer: "D", correct: false },
      ],
      score: 0.5,
      outcome: "PARTIAL",
      recommendation: "needs_review",
      gaps: ["Advanced concepts"],
      feedback: "Review the advanced topics.",
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "reply-msg-001",
      from_agent: "assessment",
      to_agent: "master",
      message_type: "AssessmentResult",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await handleMessage(makeMessage());

    // AssessmentResult dispatched to master
    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from_agent: "assessment",
        to_agent: "master",
        message_type: "AssessmentResult",
        payload: expect.objectContaining({
          score: 0.5,
          outcome: "PARTIAL",
          recommendation: "needs_review",
        }),
      })
    );

    // GapSignal dispatched to learning (because gaps exist)
    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from_agent: "assessment",
        to_agent: "learning",
        message_type: "GapSignal",
        payload: expect.objectContaining({
          gaps: ["Advanced concepts"],
        }),
      })
    );

    expect(completeMessage).toHaveBeenCalledWith("msg-001");
  });

  it("does not dispatch GapSignal when no gaps", async () => {
    vi.mocked(claimMessage).mockResolvedValue(makeMessage({ status: "processing" }));

    mockDb._mockSingle
      .mockReturnValueOnce({
        data: {
          questions: [{ q: "Q1", options: ["A", "B"], answer: "A", explanation: "X" }],
          topic_id: TOPIC_UUID,
        },
        error: null,
      })
      .mockReturnValueOnce({ data: { id: "result-uuid-002" }, error: null });

    vi.mocked(scoreAnswers).mockResolvedValue({
      answers: [{ question_index: 0, user_answer: "A", correct: true }],
      score: 1.0,
      outcome: "PASS",
      recommendation: "advance",
      gaps: [],
      feedback: undefined,
    });

    vi.mocked(dispatchMessage).mockResolvedValue({
      id: "reply-msg-002",
      from_agent: "assessment",
      to_agent: "master",
      message_type: "AssessmentResult",
      payload: {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await handleMessage(makeMessage());

    // Only AssessmentResult, no GapSignal
    expect(dispatchMessage).toHaveBeenCalledTimes(1);
    expect(dispatchMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message_type: "AssessmentResult" })
    );
  });

  it("skips if already claimed", async () => {
    vi.mocked(claimMessage).mockResolvedValue(null);
    await handleMessage(makeMessage());
    expect(scoreAnswers).not.toHaveBeenCalled();
  });

  it("fails when no content_item_id provided", async () => {
    const msg = makeMessage({
      payload: {
        intent: "assess",
        topic: "AI",
        user_id: USER_UUID,
        raw_input: "Quiz me",
      },
    });

    vi.mocked(claimMessage).mockResolvedValue({ ...msg, status: "processing" });

    await expect(handleMessage(msg)).rejects.toThrow("No content_item_id provided");
    expect(failMessage).toHaveBeenCalledWith("msg-001", "No content_item_id provided for assessment");
  });
});

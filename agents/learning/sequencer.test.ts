import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@adaptlearn/shared/db", () => ({
  getSupabaseClient: vi.fn(),
}));

import { selectNextContent, updateProgress, getNextDepth } from "./sequencer.js";
import { getSupabaseClient } from "@adaptlearn/shared/db";

const USER_UUID = "00000000-0000-0000-0000-000000000002";
const TOPIC_UUID = "00000000-0000-0000-0000-000000000001";

describe("getNextDepth", () => {
  it("advances beginner to intermediate", () => {
    expect(getNextDepth("beginner")).toBe("intermediate");
  });

  it("advances intermediate to advanced", () => {
    expect(getNextDepth("intermediate")).toBe("advanced");
  });

  it("keeps advanced at advanced", () => {
    expect(getNextDepth("advanced")).toBe("advanced");
  });
});

describe("selectNextContent", () => {
  let mockDb: {
    from: ReturnType<typeof vi.fn>;
    _progressData: unknown[];
    _contentData: unknown;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      _progressData: [],
      _contentData: null,
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "user_progress") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: mockDb._progressData,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        // content_items
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockReturnValue({
                        data: mockDb._contentData,
                        error: null,
                      }),
                    }),
                  }),
                }),
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockReturnValue({
                      data: mockDb._contentData,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    };

    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);
  });

  it("returns beginner content when no progress exists", async () => {
    mockDb._progressData = [];
    mockDb._contentData = { id: "content-001", skill: "Prompt Engineering", depth: "beginner" };

    const result = await selectNextContent(USER_UUID, TOPIC_UUID);

    expect(result.nextDepth).toBe("beginner");
    expect(result.currentStatus).toBe("not_started");
    expect(result.message).toContain("Start learning");
  });

  it("returns no-content message when nothing available", async () => {
    mockDb._progressData = [];
    mockDb._contentData = null;

    const result = await selectNextContent(USER_UUID, TOPIC_UUID);

    expect(result.nextContentItemId).toBeNull();
    expect(result.message).toContain("No content available");
  });

  it("prioritizes needs_remediation skills", async () => {
    mockDb._progressData = [
      { skill: "RAG", status: "needs_remediation", current_depth: "beginner" },
      { skill: "Prompting", status: "not_started", current_depth: "beginner" },
    ];
    mockDb._contentData = { id: "content-002", skill: "RAG", depth: "beginner" };

    const result = await selectNextContent(USER_UUID, TOPIC_UUID);

    expect(result.nextSkill).toBe("RAG");
    expect(result.message).toContain("review");
  });
});

describe("updateProgress", () => {
  it("upserts user progress", async () => {
    const mockUpsert = vi.fn().mockReturnValue({ error: null });
    const mockDb = {
      from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
    };
    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as never);

    await updateProgress(USER_UUID, TOPIC_UUID, "RAG", "in_progress", "beginner", 0.8, "content-001");

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_UUID,
        topic_id: TOPIC_UUID,
        skill: "RAG",
        status: "in_progress",
        current_depth: "beginner",
        last_score: 0.8,
      }),
      { onConflict: "user_id,topic_id,skill" }
    );
  });
});

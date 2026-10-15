import { beforeAll, describe, expect, it } from "vitest";
import { matchConcept } from "./prompts";
import type { Roadmap } from "./types";

process.env.CLASSROOM_DB = ":memory:";

const mod = { id: "c1-0", title: "Chunking", objective: "Split well", concepts: ["Chunk size", "Metadata"], contributors: [] };
const road: Roadmap = { id: "c1", goal: "Learn RAG", level: "beginner", summary: "s", contributions: {}, modules: [mod] };
const DAY = 86_400_000;

describe("matchConcept", () => {
  it("maps loosely-written names and falls back to the first concept", () => {
    expect(matchConcept(mod, "metadata!")).toBe("Metadata");
    expect(matchConcept(mod, "something unrelated")).toBe("Chunk size");
  });
});

describe("card lifecycle", () => {
  let s: typeof import("./store");
  beforeAll(async () => {
    s = await import("./store");
    s.saveRoadmap(road);
    s.addCards("c1", "c1-0", [
      { concept: "Chunk size", q: "Why not fixed-size chunks?", a: "They cut tables." },
      { concept: "Metadata", q: "Why store versions?", a: "Avoid superseded policies." },
    ]);
  });

  it("new cards are due immediately and carry roadmap context", () => {
    const due = s.dueCards();
    expect(due).toHaveLength(2);
    expect(due[0]).toMatchObject({ goal: "Learn RAG", moduleTitle: "Chunking", reps: 0 });
    expect(s.cardStats()).toEqual({ due: 2, total: 2 });
    expect(s.getBundle("c1")!.cardCounts).toEqual({ "c1-0": 2 });
  });

  it("Good pushes a card a day out; Again brings it back in minutes", () => {
    const [a, b] = s.dueCards();
    const t = Date.now();
    const good = s.reviewCard(a.id, 2, t)!;
    expect(good.due).toBe(t + DAY);
    const again = s.reviewCard(b.id, 0, t)!;
    expect(again.due).toBe(t + 600_000);
    expect(s.dueCards(t)).toHaveLength(0);
    expect(s.dueCards(t + 11 * 60_000).map((c) => c.id)).toEqual([b.id]); // only the forgotten card
    expect(s.cardStats(t + 2 * DAY)).toEqual({ due: 2, total: 2 });
  });

  it("returns null for an unknown card, and cards cascade with their roadmap", () => {
    expect(s.reviewCard(9999, 2)).toBeNull();
    s.deleteRoadmap("c1");
    expect(s.cardStats()).toEqual({ due: 0, total: 0 });
  });
});

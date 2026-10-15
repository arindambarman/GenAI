import { beforeAll, describe, expect, it } from "vitest";
import { alignConcepts } from "./prompts";
import { TeachbackRes } from "./schemas";
import type { Roadmap } from "./types";

process.env.CLASSROOM_DB = ":memory:";

const mod = { id: "m1", title: "Chunking", objective: "Split well", concepts: ["Chunk size", "Metadata", "Overlap"], contributors: [] };

describe("alignConcepts", () => {
  it("matches names loosely and defaults unrated concepts to 0, in module order", () => {
    const out = alignConcepts(mod, [
      { concept: "metadata!", rating: 3 },
      { concept: "chunk  size", rating: 2 },
      { concept: "something else", rating: 3 },
    ]);
    expect(out).toEqual([
      { concept: "Chunk size", rating: 2 },
      { concept: "Metadata", rating: 3 },
      { concept: "Overlap", rating: 0 },
    ]);
  });
});

describe("TeachbackRes", () => {
  it("accepts a valid assessment and defaults gaps", () => {
    const r = TeachbackRes.parse({ score: 4, concepts: [{ concept: "Metadata", rating: 2 }], strengths: "Clear structure" });
    expect(r.gaps).toEqual([]);
  });
  it("rejects out-of-range scores and ratings", () => {
    expect(TeachbackRes.safeParse({ score: 6, concepts: [], strengths: "ok ok" }).success).toBe(false);
    expect(TeachbackRes.safeParse({ score: 3, concepts: [{ concept: "a", rating: 4 }], strengths: "ok ok" }).success).toBe(false);
  });
});

describe("store teachbacks", () => {
  const road: Roadmap = { id: "t1", goal: "g", level: "beginner", summary: "s", contributions: {}, modules: [{ ...mod, id: "t1-0" }] };
  let s: typeof import("./store");
  beforeAll(async () => {
    s = await import("./store");
  });
  it("saves attempts in order and includes the latest in the export", () => {
    s.saveRoadmap(road);
    const base = { concepts: [{ concept: "Metadata", rating: 1 }], strengths: "ok", gaps: ["overlap"], critiques: { sage: "Why?" } };
    s.addTeachback("t1", "t1-0", { ...base, text: "first try", score: 2 });
    s.addTeachback("t1", "t1-0", { ...base, text: "second try", score: 4 });
    const b = s.getBundle("t1")!;
    expect(b.teachbacks["t1-0"].map((t) => t.score)).toEqual([2, 4]);
    expect(b.teachbacks["t1-0"][1].critiques).toEqual({ sage: "Why?" });
    const md = s.exportMarkdown("t1")!;
    expect(md).toContain("latest of 2: 4/5");
    expect(md).toContain("second try");
  });
});

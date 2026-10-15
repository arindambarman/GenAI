import { beforeAll, describe, expect, it } from "vitest";
import type { Roadmap } from "./types";

process.env.CLASSROOM_DB = ":memory:";

const road: Roadmap = {
  id: "r1",
  goal: "Learn RAG",
  level: "beginner",
  summary: "A path",
  contributions: { sage: "x" },
  modules: [
    { id: "r1-0", title: "Basics", objective: "Know RAG", concepts: ["retrieval"], contributors: ["sage"] },
    { id: "r1-1", title: "Eval", objective: "Measure it", concepts: ["recall"], contributors: [] },
  ],
};

let s: typeof import("./store");
beforeAll(async () => {
  s = await import("./store");
});

describe("store", () => {
  it("round-trips a roadmap with chats, artifacts and progress in order", () => {
    s.saveRoadmap(road);
    s.addMessages("r1", "r1-0", [{ speaker: "learner", text: "hi" }, { speaker: "sage", text: "hello" }]);
    s.addMessages("r1", "r1-0", [{ speaker: "forge", text: "example" }]);
    s.setArtifact("r1", "r1-0", "mindmap", "mindmap\n  root((A))");
    s.setArtifact("r1", "r1-0", "mindmap", "mindmap\n  root((B))"); // upsert
    s.markDone("r1", "r1-0");
    s.markDone("r1", "r1-0"); // idempotent
    const b = s.getBundle("r1")!;
    expect(b.chats["r1-0"].map((m) => m.speaker)).toEqual(["learner", "sage", "forge"]);
    expect(b.artifacts["r1-0"].mindmap).toContain("B");
    expect(b.done).toEqual(["r1-0"]);
  });

  it("lists summaries", () => {
    const [x] = s.listRoadmaps();
    expect(x).toMatchObject({ id: "r1", modules: 2, done: 1, messages: 3 });
  });

  it("exports markdown with names and diagrams", () => {
    const md = s.exportMarkdown("r1")!;
    expect(md).toContain("# Learn RAG");
    expect(md).toContain("**You:**");
    expect(md).toContain("**Sage:**");
    expect(md).toContain("```mermaid");
  });

  it("cascades on delete and returns null for unknown ids", () => {
    s.deleteRoadmap("r1");
    expect(s.getBundle("r1")).toBeNull();
    expect(s.listRoadmaps()).toEqual([]);
    expect(s.exportMarkdown("nope")).toBeNull();
  });
});

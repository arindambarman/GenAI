import { describe, expect, it } from "vitest";
import { DiffRes } from "./schemas";
import { diffPrompt } from "./prompts";

const mod = { id: "m", title: "Chunking", objective: "Split well", concepts: ["size"], contributors: [] };

describe("DiffRes", () => {
  const base = {
    agreements: ["Chunk by structure"],
    takeaway: "Use both views",
    differences: [
      {
        topic: "Chunk size",
        why: "Affects recall",
        positions: [
          { who: "Sage", stance: "Small chunks" },
          { who: "forge", stance: "Large chunks" },
          { who: "nobody", stance: "ignored" },
        ],
      },
    ],
  };
  it("normalises ids and drops unknown classmates", () => {
    const r = DiffRes.parse(base);
    expect(r.differences[0].positions.map((p) => p.who)).toEqual(["sage", "forge"]);
  });
  it("rejects a difference with a single position", () => {
    const bad = { ...base, differences: [{ ...base.differences[0], positions: [{ who: "sage", stance: "x y" }] }] };
    expect(DiffRes.safeParse(bad).success).toBe(false);
  });
});

describe("diffPrompt", () => {
  it("labels each line with the model and hides diagram source", () => {
    const p = diffPrompt("goal", mod, [
      { speaker: "forge", text: "see ```mermaid\nflowchart TD\nA-->B\n``` ok" },
      { speaker: "learner", text: "hi" },
    ]);
    expect(p).toContain("FORGE (gemini):");
    expect(p).toContain("LEARNER:");
    expect(p).not.toContain("flowchart");
  });
});

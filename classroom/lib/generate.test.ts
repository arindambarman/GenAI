import { describe, expect, it } from "vitest";
import { extractJson, parseMindmap, stripFence } from "./generate";
import { MergeRes } from "./schemas";
import { compactTranscript } from "./prompts";

describe("extractJson", () => {
  it("parses plain JSON", () => expect(extractJson('{"a":1}')).toEqual({ a: 1 }));
  it("strips fences and prose", () => expect(extractJson('Sure!\n```json\n{"a":{"b":2}}\n```')).toEqual({ a: { b: 2 } }));
  it("throws when there is no object", () => expect(() => extractJson("nope")).toThrow());
});

describe("mindmap parsing", () => {
  const good = "mindmap\n  root((RAG))\n    Chunking\n      Size\n    Retrieval";
  it("accepts a plain mindmap", () => expect(parseMindmap(good)).toBe(good));
  it("strips a code fence", () => expect(parseMindmap("```mermaid\n" + good + "\n```")).toBe(good));
  it("rejects other output", () => expect(() => parseMindmap("flowchart TD\n A-->B\n B-->C\n C-->D")).toThrow());
  it("stripFence leaves unfenced text alone", () => expect(stripFence("abc")).toBe("abc"));
});

describe("MergeRes", () => {
  const mod = (contributors: string[]) => ({ title: "Chunking", objective: "Split documents well", concepts: ["size"], contributors });
  it("normalises contributors and drops unknown ids", () => {
    const r = MergeRes.parse({ summary: "A path", modules: [mod(["Sage", "forge", "bob"]), mod([]), mod(["gadfly", "gadfly"])] });
    expect(r.modules[0].contributors).toEqual(["sage", "forge"]);
    expect(r.modules[2].contributors).toEqual(["gadfly"]);
  });
  it("rejects fewer than 3 modules", () => {
    expect(MergeRes.safeParse({ summary: "A path", modules: [mod(["sage"])] }).success).toBe(false);
  });
});

describe("compactTranscript", () => {
  it("replaces diagrams and keeps only the last N", () => {
    const ms = [
      { speaker: "forge", text: "see\n```mermaid\nflowchart TD\nA-->B\n```" },
      { speaker: "learner", text: "ok" },
    ];
    const t = compactTranscript(ms, 2);
    expect(t).toContain("[diagram]");
    expect(t).not.toContain("flowchart");
    expect(compactTranscript(ms, 1)).toBe("LEARNER: ok");
  });
});

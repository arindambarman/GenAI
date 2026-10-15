import { describe, expect, it } from "vitest";
import { bucket, computeSkills, ModuleInfo, nextSteps, reviewValue, SkillEvent, teachbackValue } from "./skills";

const DAY = 86_400_000;
const NOW = 2_000_000_000_000;
const mod = (touched = true): ModuleInfo => ({
  roadmapId: "r",
  goal: "Learn RAG",
  moduleId: "r-0",
  moduleTitle: "Chunking",
  concepts: ["Chunk size", "Metadata", "Overlap"],
  touched,
});
const ev = (concept: string, source: SkillEvent["source"], value: number, at: number): SkillEvent => ({ roadmapId: "r", moduleId: "r-0", concept, source, value, at });
const find = (s: ReturnType<typeof computeSkills>, c: string) => s.find((x) => x.concept === c)!;

describe("value mapping", () => {
  it("maps teach-back ratings (0-3) and review grades onto 0..1", () => {
    expect([0, 1.5, 3, 9].map(teachbackValue)).toEqual([0, 0.5, 1, 1]);
    expect([0, 1, 2, 3].map(reviewValue)).toEqual([0, 0.4, 0.8, 1]);
  });
});

describe("computeSkills", () => {
  it("returns every concept; untested ones have null mastery", () => {
    const s = computeSkills([mod()], [ev("Metadata", "teachback", 1, NOW)]);
    expect(s).toHaveLength(3);
    expect(find(s, "Chunk size").mastery).toBeNull();
    expect(find(s, "Metadata")).toMatchObject({ mastery: 100, signals: 1, lastAt: NOW });
  });

  it("weights recent evidence: improving after a poor start lifts the score, forgetting lowers it", () => {
    const up = computeSkills([mod()], [ev("Overlap", "teachback", 0, NOW - 2 * DAY), ev("Overlap", "teachback", 1, NOW)]);
    expect(find(up, "Overlap").mastery).toBe(60); // 0 + 0.6 * (1 - 0)
    const down = computeSkills([mod()], [ev("Overlap", "review", 1, NOW - DAY), ev("Overlap", "review", 0, NOW)]);
    expect(find(down, "Overlap").mastery).toBe(65); // 1 + 0.35 * (0 - 1)
  });

  it("does not depend on the order events are supplied in", () => {
    const a = ev("Overlap", "teachback", 0, NOW - DAY);
    const b = ev("Overlap", "teachback", 1, NOW);
    expect(computeSkills([mod()], [b, a])).toEqual(computeSkills([mod()], [a, b]));
  });

  it("ignores events for other modules", () => {
    const other: SkillEvent = { ...ev("Metadata", "teachback", 1, NOW), moduleId: "other" };
    expect(find(computeSkills([mod()], [other]), "Metadata").mastery).toBeNull();
  });
});

describe("bucket", () => {
  it("classifies mastery", () => {
    expect([null, 10, 39, 40, 69, 70, 100].map(bucket)).toEqual(["untested", "gap", "gap", "developing", "developing", "solid", "solid"]);
  });
});

describe("nextSteps", () => {
  it("ranks shaky first; a long-stale concept outranks an untested one; recent practice is not flagged", () => {
    const events = (staleDays: number) => [ev("Chunk size", "teachback", 0.2, NOW - DAY), ev("Metadata", "teachback", 1, NOW - staleDays * DAY)];
    const long = nextSteps(computeSkills([mod()], events(40)), NOW);
    expect(long.map((x) => x.skill.concept)).toEqual(["Chunk size", "Metadata", "Overlap"]);
    expect(long[0].reason).toContain("Shaky at 20%");
    expect(long[1].reason).toBe("Not practiced in 40 days");
    expect(long[2].reason).toBe("Studied but never tested");
    expect(long[2].concepts).toEqual(["Overlap"]);
    const recent = nextSteps(computeSkills([mod()], events(10)), NOW); // inside the 14-day window: not stale
    expect(recent.map((x) => x.skill.concept)).toEqual(["Chunk size", "Overlap"]);
  });

  it("skips solid, fresh and untouched concepts", () => {
    expect(nextSteps(computeSkills([mod(false)], []), NOW)).toEqual([]); // untouched module: nothing to nag about
    expect(nextSteps(computeSkills([mod()], [ev("Metadata", "teachback", 1, NOW - DAY)]), NOW).map((x) => x.skill.concept)).not.toContain("Metadata");
  });

  it("groups untested concepts into one row per module", () => {
    const f = nextSteps(computeSkills([mod()], []), NOW);
    expect(f).toHaveLength(1);
    expect(f[0].concepts).toEqual(["Chunk size", "Metadata", "Overlap"]);
    expect(f[0].reason).toBe("3 concepts studied but never tested");
  });

  it("respects the limit", () => {
    const events = [ev("Chunk size", "teachback", 0, NOW), ev("Metadata", "teachback", 0.1, NOW), ev("Overlap", "teachback", 0.2, NOW)];
    expect(nextSteps(computeSkills([mod()], events), NOW, 2)).toHaveLength(2);
  });
});

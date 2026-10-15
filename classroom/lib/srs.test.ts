import { describe, expect, it } from "vitest";
import { intervalLabel, NEW_CARD, schedule, SrsState } from "./srs";

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;

describe("schedule", () => {
  it("Good on a new card: 1 day, then 3, then interval x ease", () => {
    const a = schedule(NEW_CARD, 2, NOW);
    expect([a.interval, a.reps, a.due]).toEqual([1, 1, NOW + DAY]);
    const b = schedule(a, 2, NOW);
    expect(b.interval).toBe(3);
    const c = schedule(b, 2, NOW);
    expect(c.interval).toBe(Math.round(3 * 2.5)); // 8
    expect(c.reps).toBe(3);
  });

  it("Again resets progress, counts a lapse, lowers ease, and returns in 10 minutes", () => {
    const learned: SrsState = { reps: 4, interval: 20, ease: 2.5, lapses: 0 };
    const r = schedule(learned, 0, NOW);
    expect(r).toMatchObject({ reps: 0, interval: 0, lapses: 1, due: NOW + 600_000 });
    expect(r.ease).toBeCloseTo(2.3);
  });

  it("Easy grows faster than Good and raises ease; Hard grows slowest and lowers ease", () => {
    const s: SrsState = { reps: 3, interval: 10, ease: 2.5, lapses: 0 };
    const hard = schedule(s, 1, NOW);
    const good = schedule(s, 2, NOW);
    const easy = schedule(s, 3, NOW);
    expect(hard.interval).toBeLessThan(good.interval);
    expect(good.interval).toBeLessThan(easy.interval);
    expect(hard.ease).toBeLessThan(s.ease);
    expect(easy.ease).toBeGreaterThan(s.ease);
  });

  it("keeps ease within 1.3..3.0 and intervals at least 1 day for passing grades", () => {
    let s: SrsState = { reps: 5, interval: 30, ease: 1.35, lapses: 0 };
    for (let i = 0; i < 5; i++) s = schedule(s, 0, NOW);
    expect(s.ease).toBe(1.3);
    let t: SrsState = { reps: 5, interval: 30, ease: 2.95, lapses: 0 };
    for (let i = 0; i < 5; i++) t = schedule(t, 3, NOW);
    expect(t.ease).toBe(3);
    expect(schedule(NEW_CARD, 1, NOW).interval).toBeGreaterThanOrEqual(1);
  });

  it("does not mutate its input", () => {
    const s = { ...NEW_CARD };
    schedule(s, 2, NOW);
    expect(s).toEqual(NEW_CARD);
  });
});

describe("intervalLabel", () => {
  it("labels the wait for each grade", () => {
    expect(intervalLabel(NEW_CARD, 0)).toBe("10m");
    expect(intervalLabel(NEW_CARD, 2)).toBe("1d");
    expect(intervalLabel({ reps: 5, interval: 100, ease: 2.5, lapses: 0 }, 2)).toBe("8mo");
  });
});

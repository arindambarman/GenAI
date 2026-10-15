/** Spaced-repetition scheduling (SM-2 style). Pure functions, shared by server and UI. */

export type Grade = 0 | 1 | 2 | 3; // 0 Again, 1 Hard, 2 Good, 3 Easy

export interface SrsState {
  reps: number; // consecutive successful reviews
  interval: number; // days until next review (0 = same session)
  ease: number; // growth factor, 1.3..3.0
  lapses: number; // times forgotten
}

export const NEW_CARD: SrsState = { reps: 0, interval: 0, ease: 2.5, lapses: 0 };
export const GRADE_LABEL = ["Again", "Hard", "Good", "Easy"] as const;

const DAY = 86_400_000;
const AGAIN_DELAY = 10 * 60_000; // a forgotten card returns in 10 minutes
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface Scheduled extends SrsState {
  due: number; // epoch ms
}

export function schedule(s: SrsState, grade: Grade, now: number): Scheduled {
  if (grade === 0) {
    return { reps: 0, interval: 0, ease: clamp(s.ease - 0.2, 1.3, 3), lapses: s.lapses + 1, due: now + AGAIN_DELAY };
  }
  let interval: number;
  let ease = s.ease;
  if (grade === 1) {
    interval = Math.max(1, Math.round(Math.max(s.interval, 1) * 1.2));
    ease -= 0.15;
  } else if (grade === 2) {
    interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.interval * s.ease);
  } else {
    interval = s.reps === 0 ? 3 : Math.round(Math.max(s.interval, 1) * s.ease * 1.3);
    ease += 0.15;
  }
  interval = Math.max(1, interval);
  return { reps: s.reps + 1, interval, ease: clamp(ease, 1.3, 3), lapses: s.lapses, due: now + interval * DAY };
}

/** Human label for the wait a grade would produce, e.g. "10m", "3d", "2mo". */
export function intervalLabel(s: SrsState, grade: Grade): string {
  const next = schedule(s, grade, 0);
  if (grade === 0) return "10m";
  const d = next.interval;
  return d >= 60 ? `${Math.round(d / 30)}mo` : `${d}d`;
}

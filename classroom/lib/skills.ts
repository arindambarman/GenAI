/** Skill tracking: per-concept mastery from teach-back ratings and flashcard reviews. Pure functions. */

export interface SkillEvent {
  roadmapId: string;
  moduleId: string;
  concept: string;
  source: "teachback" | "review";
  value: number; // 0..1
  at: number; // epoch ms
}

export interface ModuleInfo {
  roadmapId: string;
  goal: string;
  moduleId: string;
  moduleTitle: string;
  concepts: string[];
  touched: boolean; // the learner has discussed or finished it
}

export interface Skill {
  roadmapId: string;
  goal: string;
  moduleId: string;
  moduleTitle: string;
  concept: string;
  mastery: number | null; // 0..100, null = never tested
  signals: number;
  lastAt: number | null;
  touched: boolean;
}

export interface Focus {
  skill: Skill;
  concepts: string[]; // the concept(s) this item covers; untested ones are grouped per module
  reason: string;
  action: string;
  priority: number;
}

export type Bucket = "untested" | "gap" | "developing" | "solid";

const DAY = 86_400_000;
const ALPHA = { teachback: 0.6, review: 0.35 }; // how strongly a new signal moves the score; explaining counts more than recall
const REVIEW_VALUE = [0, 0.4, 0.8, 1]; // Again, Hard, Good, Easy

export const teachbackValue = (rating: number) => Math.min(1, Math.max(0, rating / 3));
export const reviewValue = (grade: number) => REVIEW_VALUE[Math.min(3, Math.max(0, grade))];

export function bucket(mastery: number | null): Bucket {
  if (mastery === null) return "untested";
  return mastery < 40 ? "gap" : mastery < 70 ? "developing" : "solid";
}

/**
 * Exponentially weighted mastery per concept, in time order: recent evidence counts most, so improving
 * (or forgetting) shows up quickly. Every concept of every module is returned, tested or not.
 */
export function computeSkills(modules: ModuleInfo[], events: SkillEvent[]): Skill[] {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const out: Skill[] = [];
  for (const m of modules) {
    for (const concept of m.concepts) {
      let mastery: number | null = null;
      let signals = 0;
      let lastAt: number | null = null;
      for (const e of sorted) {
        if (e.roadmapId !== m.roadmapId || e.moduleId !== m.moduleId || e.concept !== concept) continue;
        mastery = mastery === null ? e.value : mastery + ALPHA[e.source] * (e.value - mastery);
        signals++;
        lastAt = e.at;
      }
      out.push({
        roadmapId: m.roadmapId,
        goal: m.goal,
        moduleId: m.moduleId,
        moduleTitle: m.moduleTitle,
        concept,
        mastery: mastery === null ? null : Math.round(mastery * 100),
        signals,
        lastAt,
        touched: m.touched,
      });
    }
  }
  return out;
}

/** What to work on next: shaky concepts first, then studied-but-untested, then stale ones. */
export function nextSteps(skills: Skill[], now: number, limit = 5, staleDays = 14): Focus[] {
  const focus: Focus[] = [];
  const untested = new Map<string, Focus>(); // one row per module, not one per concept
  for (const s of skills) {
    if (s.mastery !== null && s.mastery < 50) {
      focus.push({
        skill: s,
        priority: 100 - s.mastery,
        concepts: [s.concept],
        reason: `Shaky at ${s.mastery}% after ${s.signals} check${s.signals === 1 ? "" : "s"}`,
        action: "Redo a teach-back or review its flashcards",
      });
    } else if (s.mastery === null && s.touched) {
      const key = `${s.roadmapId}/${s.moduleId}`;
      const f = untested.get(key);
      if (f) f.concepts.push(s.concept);
      else untested.set(key, { skill: s, priority: 45, concepts: [s.concept], reason: "", action: "Try a teach-back on this module" });
    } else if (s.mastery !== null && s.lastAt !== null && now - s.lastAt > staleDays * DAY) {
      const days = Math.floor((now - s.lastAt) / DAY);
      focus.push({ skill: s, priority: 30 + Math.min(days, 30), concepts: [s.concept], reason: `Not practiced in ${days} days`, action: "Review its flashcards to keep it fresh" });
    }
  }
  for (const f of untested.values()) {
    f.reason = f.concepts.length === 1 ? "Studied but never tested" : `${f.concepts.length} concepts studied but never tested`;
    focus.push(f);
  }
  return focus.sort((a, b) => b.priority - a.priority).slice(0, limit);
}

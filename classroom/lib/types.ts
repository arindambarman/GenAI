export type ProviderId = "claude" | "gemini" | "mock";
export type Level = "beginner" | "intermediate" | "advanced";

export interface Persona {
  id: string;
  name: string;
  provider: ProviderId;
  style: string; // one-line learning approach, shown in UI
  lens: string; // how this agent shapes a roadmap
  role: string; // this agent's default job in a lesson
  review: string; // how this agent critiques a learner's explanation
  system: string;
  color: string;
}

export interface Module {
  id: string;
  title: string;
  objective: string;
  concepts: string[];
  contributors: string[]; // persona ids whose proposals shaped it
}

export interface Roadmap {
  id: string;
  goal: string; // the learner's goal or topic, verbatim
  level: Level;
  summary: string;
  modules: Module[];
  contributions: Record<string, string>; // persona id -> their proposal
}

export interface Message {
  speaker: string; // "learner" or a persona id
  text: string;
}

export interface RoadmapSummary {
  id: string;
  goal: string;
  level: string;
  createdAt: number;
  modules: number;
  done: number;
  messages: number;
}

/** Everything stored for one roadmap. */
export interface Bundle {
  roadmap: Roadmap;
  done: string[];
  chats: Record<string, Message[]>;
  artifacts: Record<string, Record<string, string>>; // moduleId -> kind -> text
  teachbacks: Record<string, Teachback[]>; // moduleId -> attempts, oldest first
  cardCounts: Record<string, number>; // moduleId -> flashcards made
}

/** Teacher's comparison of the classmates' views in a module. */
export interface Diff {
  agreements: string[];
  differences: { topic: string; positions: { who: string; stance: string }[]; why: string }[];
  takeaway: string;
}

export interface ConceptRating {
  concept: string;
  rating: number; // 0 missing, 1 shaky, 2 good, 3 strong
}

/** One attempt at explaining a module back to the class. */
export interface Teachback {
  id?: number;
  text: string;
  score: number; // 1-5 overall
  concepts: ConceptRating[];
  strengths: string;
  gaps: string[];
  critiques: Record<string, string>; // persona id -> critique
  createdAt?: number;
}

export interface NewCard {
  concept: string;
  q: string;
  a: string;
}

/** A flashcard with its schedule, plus where it came from. */
export interface DueCard extends NewCard {
  id: number;
  roadmapId: string;
  moduleId: string;
  moduleTitle: string;
  goal: string;
  reps: number;
  interval: number;
  ease: number;
  lapses: number;
  due: number;
}

export interface CardStats {
  due: number;
  total: number;
}

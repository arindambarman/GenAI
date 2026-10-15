import { z } from "zod";
import { PERSONAS } from "./personas";

const IDS = PERSONAS.map((p) => p.id);

export const LevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const MessageSchema = z.object({ speaker: z.string().max(40), text: z.string().max(6000) });

export const ModuleSchema = z.object({
  id: z.string().max(60),
  title: z.string().min(2).max(120),
  objective: z.string().min(5).max(400),
  concepts: z.array(z.string().max(120)).max(8),
  contributors: z.array(z.string()).max(5),
});

/** What the teacher model returns when merging proposals. Contributors are normalised to known ids. */
export const MergeRes = z.object({
  summary: z.string().min(5).max(600),
  modules: z
    .array(
      z.object({
        title: z.string().min(2).max(120),
        objective: z.string().min(5).max(400),
        concepts: z.array(z.string().max(120)).min(1).max(8),
        contributors: z
          .array(z.string())
          .default([])
          .transform((a) => Array.from(new Set(a.map((x) => x.toLowerCase().trim()).filter((x) => IDS.includes(x))))),
      }),
    )
    .min(3)
    .max(8),
});

export const ContributeReq = z.object({
  personaId: z.string(),
  goal: z.string().min(2).max(500),
  level: LevelSchema,
  feedback: z.string().max(1000).default(""),
});

export const MergeReq = z.object({
  goal: z.string().min(2).max(500),
  level: LevelSchema,
  feedback: z.string().max(1000).default(""),
  contributions: z.record(z.string().max(4000)),
});

export const TurnReq = z.object({
  personaId: z.string(),
  goal: z.string().max(500),
  level: LevelSchema,
  module: ModuleSchema,
  outline: z.array(z.string().max(120)).max(10),
  transcript: z.array(MessageSchema).max(30),
  message: z.string().max(2000),
  opening: z.boolean().default(false),
  directive: z.string().max(200).default(""),
});

export const MindmapReq = z.object({ goal: z.string().max(500), level: LevelSchema, module: ModuleSchema });
export const RecapReq = z.object({
  goal: z.string().max(500),
  module: ModuleSchema,
  transcript: z.array(MessageSchema).max(40),
});

// ---- storage ----
export const RoadmapSchema = z.object({
  id: z.string().min(1).max(60),
  goal: z.string().min(1).max(500),
  level: LevelSchema,
  summary: z.string().max(600),
  modules: z.array(ModuleSchema).min(1).max(12),
  contributions: z.record(z.string().max(4000)),
});

export const AddMessagesReq = z.object({
  roadmapId: z.string().max(60),
  moduleId: z.string().max(80),
  messages: z.array(MessageSchema).min(1).max(10),
});
export const ArtifactReq = z.object({
  roadmapId: z.string().max(60),
  moduleId: z.string().max(80),
  kind: z.enum(["mindmap", "recap", "diff"]),
  text: z.string().max(20000),
});
export const DoneReq = z.object({ roadmapId: z.string().max(60), moduleId: z.string().max(80) });
export const ImportReq = z.object({
  roadmap: RoadmapSchema,
  done: z.array(z.string()).default([]),
  chats: z.record(z.array(MessageSchema)).default({}),
  artifacts: z.record(z.record(z.string().max(20000))).default({}),
});

// ---- perspective diff ----
export const DiffReq = z.object({
  goal: z.string().max(500),
  module: ModuleSchema,
  transcript: z.array(MessageSchema).max(40),
});
export const DiffRes = z.object({
  agreements: z.array(z.string().min(3).max(300)).min(1).max(5),
  differences: z
    .array(
      z.object({
        topic: z.string().min(2).max(160),
        positions: z
          .array(z.object({ who: z.string().transform((x) => x.toLowerCase().trim()), stance: z.string().min(2).max(400) }))
          .min(2)
          .max(4)
          .transform((a) => a.filter((x) => IDS.includes(x.who))),
        why: z.string().min(3).max(400),
      }),
    )
    .min(1)
    .max(5),
  takeaway: z.string().min(5).max(500),
});

// ---- teach-back ----
export const TeachbackReq = z.object({
  goal: z.string().max(500),
  level: LevelSchema,
  module: ModuleSchema,
  explanation: z.string().min(40).max(4000),
});
export const CritiqueReq = TeachbackReq.extend({ personaId: z.string() });
export const TeachbackRes = z.object({
  score: z.number().int().min(1).max(5),
  concepts: z.array(z.object({ concept: z.string().max(160), rating: z.number().int().min(0).max(3) })).max(12),
  strengths: z.string().min(3).max(600),
  gaps: z.array(z.string().max(300)).max(4).default([]),
});
export const SaveTeachbackReq = z.object({
  roadmapId: z.string().max(60),
  moduleId: z.string().max(80),
  text: z.string().min(1).max(4000),
  score: z.number().int().min(1).max(5),
  concepts: z.array(z.object({ concept: z.string().max(160), rating: z.number().int().min(0).max(3) })).max(12),
  strengths: z.string().max(600),
  gaps: z.array(z.string().max(300)).max(4),
  critiques: z.record(z.string().max(4000)),
});

// ---- flashcards ----
export const CardsReq = z.object({
  goal: z.string().max(500),
  module: ModuleSchema,
  transcript: z.array(MessageSchema).max(40),
});
export const CardsRes = z.object({
  cards: z
    .array(z.object({ concept: z.string().max(160), q: z.string().min(8).max(400), a: z.string().min(2).max(700) }))
    .min(3)
    .max(8),
});
export const SaveCardsReq = z.object({
  roadmapId: z.string().max(60),
  moduleId: z.string().max(80),
  cards: z.array(z.object({ concept: z.string().max(160), q: z.string().min(1).max(400), a: z.string().min(1).max(700) })).min(1).max(10),
});
export const ReviewReq = z.object({ id: z.number().int().positive(), grade: z.number().int().min(0).max(3) });

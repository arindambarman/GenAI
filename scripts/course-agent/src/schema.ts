import { z } from "zod";

export const LessonIdSchema = z.string().regex(/^\d+\.\d+$/, "Lesson id must look like 1.1");

export const LessonSpecSchema = z.object({
  module: z.number().int().positive(),
  lesson: LessonIdSchema,
  title: z.string().min(3),
  durationHours: z.number().positive().optional(),
  prereqs: z.array(LessonIdSchema).default([]),
  forwardRefs: z.array(z.string()).default([]),
});
export type LessonSpec = z.infer<typeof LessonSpecSchema>;

export const SectionSchema = z.object({
  number: z.union([z.literal(0), z.number().int().min(1).max(9)]),
  title: z.string(),
  body: z.string(),
});
export type Section = z.infer<typeof SectionSchema>;

export const ParsedLessonSchema = z.object({
  id: LessonIdSchema,
  title: z.string(),
  intro: z.string().optional(),
  sections: z.array(SectionSchema).min(1),
});
export type ParsedLesson = z.infer<typeof ParsedLessonSchema>;

export const StageResultSchema = z.object({
  stage: z.enum(["content", "diagrams", "web"]),
  ok: z.boolean(),
  outputs: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  error: z.string().optional(),
});
export type StageResult = z.infer<typeof StageResultSchema>;

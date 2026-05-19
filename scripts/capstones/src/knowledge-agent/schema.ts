import { z } from "zod";

export const KBOperationSchema = z.enum(["query", "add", "organize"]);
export type KBOperation = z.infer<typeof KBOperationSchema>;

export const KBNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  related: z.array(z.string()).default([]),
  body: z.string(),
});
export type KBNote = z.infer<typeof KBNoteSchema>;

export const KBQueryAnswerSchema = z.object({
  question: z.string(),
  answer: z.string().min(30),
  citations: z.array(z.object({
    note_id: z.string(),
    note_title: z.string(),
    passage: z.string(),
    supports: z.string(),
  })),
  confidence: z.number().min(0).max(1),
  related_notes: z.array(z.string()),
  gaps: z.array(z.string()),
});
export type KBQueryAnswer = z.infer<typeof KBQueryAnswerSchema>;

export const OrganizationReportSchema = z.object({
  total_notes: z.number(),
  clusters: z.array(z.object({
    theme: z.string(),
    note_ids: z.array(z.string()),
    summary: z.string(),
  })),
  orphans: z.array(z.string()).describe("Note IDs with no incoming or outgoing links"),
  suggested_links: z.array(z.object({
    from: z.string(),
    to: z.string(),
    reason: z.string(),
  })),
  gaps: z.array(z.string()).describe("Topics the KB lacks coverage on"),
});
export type OrganizationReport = z.infer<typeof OrganizationReportSchema>;

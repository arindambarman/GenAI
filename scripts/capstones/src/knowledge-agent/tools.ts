import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolRegistry } from "../shared/tool.js";
import type { KBNote } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, "kb");

let cachedKB: KBNote[] | null = null;

async function loadKB(): Promise<KBNote[]> {
  if (cachedKB) return cachedKB;
  try {
    await mkdir(KB_DIR, { recursive: true });
  } catch {}
  const files = (await readdir(KB_DIR)).filter((f) => f.endsWith(".md"));
  const notes: KBNote[] = [];
  for (const file of files) {
    const content = await readFile(join(KB_DIR, file), "utf-8");
    const fm = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fm) continue;
    const meta = parseFrontmatter(fm[1]);
    notes.push({
      id: String(meta.id),
      title: String(meta.title),
      tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
      related: Array.isArray(meta.related) ? (meta.related as string[]) : [],
      body: fm[2].trim(),
    });
  }
  cachedKB = notes;
  return notes;
}

function parseFrontmatter(yaml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (raw.startsWith("[") && raw.endsWith("]")) {
      out[key] = raw
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter((s) => s.length > 0);
    } else if (/^\d+$/.test(raw)) {
      out[key] = Number(raw);
    } else {
      out[key] = raw.replace(/^"|"$/g, "");
    }
  }
  return out;
}

function serializeNote(note: KBNote): string {
  const fm =
    `---\n` +
    `id: ${note.id}\n` +
    `title: ${note.title}\n` +
    `tags: [${note.tags.join(", ")}]\n` +
    `related: [${note.related.join(", ")}]\n` +
    `---\n\n` +
    note.body.trim() +
    "\n";
  return fm;
}

function invalidateKBCache(): void {
  cachedKB = null;
}

// ─── Tools ───────────────────────────────────────────────────────────────

export const queryKBTool = {
  name: "query_kb",
  description:
    "Search the knowledge base for notes matching a query. Returns note IDs, titles, tags, and snippets. Use this first to find candidates; then use read_note for full text.",
  inputSchema: z.object({
    query: z.string().describe("Search terms (typically the user's question or its keywords)."),
    k: z.number().int().min(1).max(20).default(5),
  }),
  handler: async (args: { query: string; k: number }): Promise<{
    results: { id: string; title: string; tags: string[]; snippet: string; score: number }[];
  }> => {
    const kb = await loadKB();
    const terms = args.query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    const scored = kb.map((n) => {
      const haystack = (n.title + " " + n.tags.join(" ") + " " + n.body).toLowerCase();
      let score = 0;
      for (const t of terms) {
        const titleHits = (n.title.toLowerCase().split(t).length - 1) * 3;
        const tagHits = (n.tags.join(" ").toLowerCase().split(t).length - 1) * 2;
        const bodyHits = haystack.split(t).length - 1;
        score += titleHits + tagHits + bodyHits;
      }
      return { note: n, score };
    });
    const top = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, args.k);
    return {
      results: top.map((s) => ({
        id: s.note.id,
        title: s.note.title,
        tags: s.note.tags,
        snippet: s.note.body.slice(0, 200),
        score: s.score,
      })),
    };
  },
} as const;

export const readNoteTool = {
  name: "read_note",
  description: "Read the full text of a note by its ID. Use after query_kb to inspect candidates in detail.",
  inputSchema: z.object({
    id: z.string(),
  }),
  handler: async (args: { id: string }): Promise<KBNote> => {
    const kb = await loadKB();
    const note = kb.find((n) => n.id === args.id);
    if (!note) {
      throw new Error(`Note not found: ${args.id}. Use query_kb to find valid IDs.`);
    }
    return note;
  },
} as const;

export const listAllNotesTool = {
  name: "list_all_notes",
  description:
    "List ALL notes in the knowledge base (titles + IDs + tag-list only, no body). Use this for organization tasks where you need a global view.",
  inputSchema: z.object({}),
  handler: async (): Promise<{ notes: { id: string; title: string; tags: string[]; related_count: number; outbound_links: string[] }[]; total: number }> => {
    const kb = await loadKB();
    return {
      notes: kb.map((n) => ({
        id: n.id,
        title: n.title,
        tags: n.tags,
        related_count: n.related.length,
        outbound_links: n.related,
      })),
      total: kb.length,
    };
  },
} as const;

export const addNoteTool = {
  name: "add_note",
  description:
    "Create a new note in the knowledge base. Use when the user provides new content or when you need to record an insight from synthesis.",
  inputSchema: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
    title: z.string(),
    tags: z.array(z.string()),
    related: z.array(z.string()).default([]),
    body: z.string().min(50),
  }),
  handler: async (args: KBNote): Promise<{ created: true; id: string; path: string }> => {
    const kb = await loadKB();
    if (kb.find((n) => n.id === args.id)) {
      throw new Error(`Note ${args.id} already exists. Use a different ID.`);
    }
    const path = join(KB_DIR, `${args.id}.md`);
    await writeFile(path, serializeNote(args), "utf-8");
    invalidateKBCache();
    return { created: true, id: args.id, path };
  },
} as const;

export const linkNotesTool = {
  name: "link_notes",
  description:
    "Add a related-to link between two existing notes. Bidirectional: both notes get linked. Use to enrich the knowledge graph when you discover relationships.",
  inputSchema: z.object({
    from_id: z.string(),
    to_id: z.string(),
  }),
  handler: async (args: { from_id: string; to_id: string }): Promise<{ linked: true; updated: string[] }> => {
    const kb = await loadKB();
    const from = kb.find((n) => n.id === args.from_id);
    const to = kb.find((n) => n.id === args.to_id);
    if (!from || !to) {
      throw new Error(`One of the notes does not exist (${args.from_id}, ${args.to_id}).`);
    }
    const updated: string[] = [];
    if (!from.related.includes(args.to_id)) {
      from.related.push(args.to_id);
      await writeFile(join(KB_DIR, `${from.id}.md`), serializeNote(from), "utf-8");
      updated.push(from.id);
    }
    if (!to.related.includes(args.from_id)) {
      to.related.push(args.from_id);
      await writeFile(join(KB_DIR, `${to.id}.md`), serializeNote(to), "utf-8");
      updated.push(to.id);
    }
    invalidateKBCache();
    return { linked: true, updated };
  },
} as const;

export const submitAnswerTool = {
  name: "submit_answer",
  description:
    "Submit your final answer to the user's question with citations. Terminal: agent loop ends after this call.",
  inputSchema: z.object({
    answer: z.string().min(30),
    citations: z.array(z.object({
      note_id: z.string(),
      note_title: z.string(),
      passage: z.string(),
      supports: z.string(),
    })),
    confidence: z.number().min(0).max(1),
    related_notes: z.array(z.string()).describe("IDs of notes the user might find relevant."),
    gaps: z.array(z.string()).describe("Topics not covered by the KB; the user could fill these in."),
  }),
  handler: async (args: unknown): Promise<{ submitted: true; payload: unknown }> => {
    return { submitted: true, payload: args };
  },
} as const;

export const submitOrganizationTool = {
  name: "submit_organization",
  description:
    "Submit a knowledge-base organization report (clusters, orphans, suggested links, gaps). Terminal for organize-mode.",
  inputSchema: z.object({
    total_notes: z.number(),
    clusters: z.array(z.object({
      theme: z.string(),
      note_ids: z.array(z.string()),
      summary: z.string(),
    })),
    orphans: z.array(z.string()),
    suggested_links: z.array(z.object({
      from: z.string(),
      to: z.string(),
      reason: z.string(),
    })),
    gaps: z.array(z.string()),
  }),
  handler: async (args: unknown): Promise<{ submitted: true; payload: unknown }> => {
    return { submitted: true, payload: args };
  },
} as const;

export const knowledgeTools: ToolRegistry = {
  query_kb: queryKBTool,
  read_note: readNoteTool,
  list_all_notes: listAllNotesTool,
  add_note: addNoteTool,
  link_notes: linkNotesTool,
  submit_answer: submitAnswerTool,
  submit_organization: submitOrganizationTool,
};

export async function getAllNotes(): Promise<KBNote[]> {
  return loadKB();
}

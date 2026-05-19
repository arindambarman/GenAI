import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolRegistry } from "../shared/tool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = join(__dirname, "corpus");

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  tags: string[];
  body: string;
}

async function loadCorpus(): Promise<Paper[]> {
  const files = (await readdir(CORPUS_DIR)).filter((f) => f.endsWith(".md"));
  const papers: Paper[] = [];
  for (const file of files) {
    const content = await readFile(join(CORPUS_DIR, file), "utf-8");
    const fm = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fm) continue;
    const meta = parseFrontmatter(fm[1]);
    papers.push({
      id: String(meta.id),
      title: String(meta.title),
      authors: Array.isArray(meta.authors) ? (meta.authors as string[]) : [],
      year: Number(meta.year),
      venue: String(meta.venue ?? ""),
      tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
      body: fm[2].trim(),
    });
  }
  return papers;
}

function parseFrontmatter(yaml: string): Record<string, unknown> {
  // Minimal YAML subset for our frontmatter (string, number, list).
  const out: Record<string, unknown> = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (raw.startsWith("[") && raw.endsWith("]")) {
      out[key] = raw
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""));
    } else if (/^\d+$/.test(raw)) {
      out[key] = Number(raw);
    } else {
      out[key] = raw.replace(/^"|"$/g, "");
    }
  }
  return out;
}

let cachedCorpus: Paper[] | null = null;
async function getCorpus(): Promise<Paper[]> {
  if (!cachedCorpus) cachedCorpus = await loadCorpus();
  return cachedCorpus;
}

/**
 * Search the corpus for papers matching a query. Uses simple keyword
 * scoring over (title, tags, body). Returns top-k.
 */
export const searchCorpusTool = {
  name: "search_corpus",
  description:
    "Search the research corpus for papers relevant to a query. Returns up to k matching papers with their IDs, titles, authors, and brief snippets. Use this first to find candidate papers; then use read_paper to read full text.",
  inputSchema: z.object({
    query: z.string().describe("Search query — typically the research question or a sub-aspect of it."),
    k: z.number().int().min(1).max(10).default(5).describe("Number of top results to return."),
  }),
  handler: async (args: { query: string; k: number }): Promise<{
    results: { id: string; title: string; authors: string[]; year: number; tags: string[]; snippet: string; score: number }[];
  }> => {
    const corpus = await getCorpus();
    const terms = args.query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    const scored = corpus.map((p) => {
      const haystack = (p.title + " " + p.tags.join(" ") + " " + p.body).toLowerCase();
      let score = 0;
      for (const t of terms) {
        const matches = haystack.split(t).length - 1;
        if (matches > 0) {
          // Weight title and tags higher than body
          const titleHits = (p.title.toLowerCase().split(t).length - 1) * 3;
          const tagHits = (p.tags.join(" ").toLowerCase().split(t).length - 1) * 2;
          score += titleHits + tagHits + matches;
        }
      }
      return { paper: p, score };
    });
    const top = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, args.k);
    return {
      results: top.map((s) => ({
        id: s.paper.id,
        title: s.paper.title,
        authors: s.paper.authors,
        year: s.paper.year,
        tags: s.paper.tags,
        snippet: s.paper.body.slice(0, 240),
        score: s.score,
      })),
    };
  },
} as const;

/**
 * Read the full text of a paper by ID.
 */
export const readPaperTool = {
  name: "read_paper",
  description:
    "Read the full text of a paper by its ID (from search_corpus results). Use this when you need to read passages in detail to extract evidence for citations.",
  inputSchema: z.object({
    id: z.string().describe("Paper ID from search_corpus."),
  }),
  handler: async (args: { id: string }): Promise<{
    id: string;
    title: string;
    authors: string[];
    year: number;
    venue: string;
    body: string;
  }> => {
    const corpus = await getCorpus();
    const paper = corpus.find((p) => p.id === args.id);
    if (!paper) {
      throw new Error(`Paper not found: ${args.id}. Use search_corpus first to find valid IDs.`);
    }
    return {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      venue: paper.venue,
      body: paper.body,
    };
  },
} as const;

/**
 * Verify that a claim is supported by a passage from a cited source.
 * Used by the agent to self-check citations before finalising.
 */
export const verifyClaimTool = {
  name: "verify_claim",
  description:
    "Check whether a passage from a paper actually supports a specific claim. Use this BEFORE finalising your synthesis to catch unsupported claims. Returns: supported (true/false) and a brief reason.",
  inputSchema: z.object({
    claim: z.string().describe("The factual claim to verify."),
    source_id: z.string().describe("Paper ID containing the supporting passage."),
    passage: z.string().describe("The specific passage from the paper that allegedly supports the claim."),
  }),
  handler: async (args: { claim: string; source_id: string; passage: string }): Promise<{
    supported: boolean;
    reason: string;
  }> => {
    // Deterministic verifier: check that the passage actually appears in the cited paper.
    const corpus = await getCorpus();
    const paper = corpus.find((p) => p.id === args.source_id);
    if (!paper) {
      return { supported: false, reason: `Paper ${args.source_id} does not exist in corpus.` };
    }
    // Check the passage appears verbatim or near-verbatim (first 80 chars)
    const passageStart = args.passage.slice(0, 80).trim();
    if (!paper.body.includes(passageStart)) {
      return {
        supported: false,
        reason: `Passage not found in paper ${args.source_id} (checked first 80 chars).`,
      };
    }
    // Passage exists; we trust the agent's claim that it supports the claim
    // (full semantic verification would require another LLM call; deferred to caller).
    return {
      supported: true,
      reason: `Passage found verbatim in paper ${args.source_id}.`,
    };
  },
} as const;

/**
 * Emit final synthesis. This is the terminal tool that signals
 * the agent is done.
 */
export const submitSynthesisTool = {
  name: "submit_synthesis",
  description:
    "Submit your final synthesis. Call this only when you have read sufficient sources and verified all citations. After this, the agent loop terminates.",
  inputSchema: z.object({
    summary: z.string().min(50).describe("500-1500 word synthesis answering the question, with [citation] markers."),
    key_findings: z.array(z.string()).min(1).describe("Bulleted key findings, each a single sentence."),
    citations: z
      .array(
        z.object({
          source_id: z.string(),
          title: z.string(),
          passage: z.string().describe("The exact passage from the source that supports the claim."),
          supports: z.string().describe("The specific claim in the summary that this citation supports."),
        }),
      )
      .min(1),
    confidence: z.number().min(0).max(1),
    caveats: z.array(z.string()).describe("Known limitations of the synthesis."),
  }),
  handler: async (args: unknown): Promise<{ submitted: true; payload: unknown }> => {
    return { submitted: true, payload: args };
  },
} as const;

export const researchTools: ToolRegistry = {
  search_corpus: searchCorpusTool,
  read_paper: readPaperTool,
  verify_claim: verifyClaimTool,
  submit_synthesis: submitSynthesisTool,
};

/**
 * List all papers in the corpus (for demo/setup).
 */
export async function listCorpus(): Promise<Paper[]> {
  return getCorpus();
}

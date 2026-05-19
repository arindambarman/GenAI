import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { z } from "zod";
import type { ToolRegistry } from "../shared/tool.js";
import {
  ConceptSchema,
  RelationshipSchema,
  OptimizationSchema,
  type Concept,
  type Relationship,
  type Optimization,
} from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Course content lives at <repo-root>/course/
const COURSE_DIR = resolve(__dirname, "../../../../course");

interface LearnerState {
  concepts: Concept[];
  relationships: Relationship[];
  optimizations: Optimization[];
  modulesRead: Set<string>;
}

let state: LearnerState = {
  concepts: [],
  relationships: [],
  optimizations: [],
  modulesRead: new Set(),
};

export function resetState(): void {
  state = {
    concepts: [],
    relationships: [],
    optimizations: [],
    modulesRead: new Set(),
  };
}

export function getState(): {
  concepts: Concept[];
  relationships: Relationship[];
  optimizations: Optimization[];
  modulesRead: string[];
} {
  return {
    concepts: state.concepts.slice(),
    relationships: state.relationships.slice(),
    optimizations: state.optimizations.slice(),
    modulesRead: [...state.modulesRead],
  };
}

interface ModuleMeta {
  id: string;
  filename: string;
  title: string;
  lessons: { id: string; title: string }[];
}

async function loadModuleMetadata(): Promise<ModuleMeta[]> {
  if (!existsSync(COURSE_DIR)) return [];
  const files = (await readdir(COURSE_DIR))
    .filter((f) => f.startsWith("module-") && f.endsWith(".md"))
    .sort();
  const modules: ModuleMeta[] = [];
  for (const file of files) {
    const idMatch = file.match(/^module-(\d+)/);
    if (!idMatch) continue;
    const content = await readFile(join(COURSE_DIR, file), "utf-8");
    const titleMatch = content.match(/^# Module \d+ — (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Module ${idMatch[1]}`;
    const lessons: { id: string; title: string }[] = [];
    const lessonRe = /^# Lesson (\d+\.\d+)\s+[—-]\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = lessonRe.exec(content)) !== null) {
      lessons.push({ id: m[1], title: m[2].trim() });
    }
    modules.push({
      id: idMatch[1],
      filename: file,
      title,
      lessons,
    });
  }
  return modules;
}

let cachedMeta: ModuleMeta[] | null = null;
async function getMeta(): Promise<ModuleMeta[]> {
  if (!cachedMeta) cachedMeta = await loadModuleMetadata();
  return cachedMeta;
}

// ─── Tools ───────────────────────────────────────────────────────────

export const listCourseModulesTool = {
  name: "list_course_modules",
  description:
    "List all course modules with their titles and lesson IDs. Use this FIRST to plan which modules to read.",
  inputSchema: z.object({}),
  handler: async (): Promise<{
    modules: { id: string; title: string; lesson_count: number; lessons: { id: string; title: string }[] }[];
    total_modules: number;
    total_lessons: number;
  }> => {
    const meta = await getMeta();
    return {
      modules: meta.map((m) => ({
        id: m.id,
        title: m.title,
        lesson_count: m.lessons.length,
        lessons: m.lessons,
      })),
      total_modules: meta.length,
      total_lessons: meta.reduce((acc, m) => acc + m.lessons.length, 0),
    };
  },
} as const;

export const readCourseModuleTool = {
  name: "read_course_module",
  description:
    "Read the full text of a course module. Returns the markdown. Caution: modules are ~5-8K words each. Use this to extract concepts and relationships from one module at a time, then call record_concept / record_relationship / record_optimization. After processing, mark_module_processed to remember what's done.",
  inputSchema: z.object({
    module_id: z.string().describe("Module ID like '01' or '1' (auto-padded)."),
  }),
  handler: async (args: { module_id: string }): Promise<{
    id: string;
    title: string;
    word_count: number;
    body: string;
  }> => {
    const meta = await getMeta();
    const padded = args.module_id.padStart(2, "0");
    const mod = meta.find((m) => m.id === padded || m.id === args.module_id);
    if (!mod) {
      throw new Error(
        `Module ${args.module_id} not found. Available: ${meta.map((m) => m.id).join(", ")}`,
      );
    }
    const body = await readFile(join(COURSE_DIR, mod.filename), "utf-8");
    return {
      id: mod.id,
      title: mod.title,
      word_count: body.split(/\s+/).length,
      body,
    };
  },
} as const;

export const recordConceptTool = {
  name: "record_concept",
  description:
    "Record a key concept extracted from the course. Concepts are persisted across the agent's full run and aggregated into the final knowledge base.",
  inputSchema: ConceptSchema,
  handler: async (args: Concept): Promise<{ recorded: true; total: number }> => {
    // Dedupe by id; if exists, merge source_lessons
    const existing = state.concepts.find((c) => c.id === args.id);
    if (existing) {
      const merged = new Set([...existing.source_lessons, ...args.source_lessons]);
      existing.source_lessons = [...merged];
      if (args.importance > existing.importance) existing.importance = args.importance;
    } else {
      state.concepts.push(args);
    }
    return { recorded: true, total: state.concepts.length };
  },
} as const;

export const recordRelationshipTool = {
  name: "record_relationship",
  description:
    "Record a relationship between two concepts. Both concepts should already be recorded via record_concept (or recorded later in the same run).",
  inputSchema: RelationshipSchema,
  handler: async (args: Relationship): Promise<{ recorded: true; total: number }> => {
    // Dedupe by (from, to, type)
    const exists = state.relationships.some(
      (r) => r.from === args.from && r.to === args.to && r.type === args.type,
    );
    if (!exists) state.relationships.push(args);
    return { recorded: true, total: state.relationships.length };
  },
} as const;

export const recordOptimizationTool = {
  name: "record_optimization",
  description:
    "Record a suggested optimization for the course content — sequencing issues, missing examples, weak explanations, etc.",
  inputSchema: OptimizationSchema,
  handler: async (args: Optimization): Promise<{ recorded: true; total: number }> => {
    state.optimizations.push(args);
    return { recorded: true, total: state.optimizations.length };
  },
} as const;

export const getRecordedConceptsTool = {
  name: "get_recorded_concepts",
  description:
    "List previously recorded concepts (optionally filtered by category). Useful for cross-referencing while reading later modules — e.g., 'is the agency dial already recorded?'",
  inputSchema: z.object({
    category: z.string().optional(),
    name_contains: z.string().optional(),
  }),
  handler: async (args: { category?: string; name_contains?: string }): Promise<{
    matches: { id: string; name: string; category: string; source_lessons: string[] }[];
    total_recorded: number;
  }> => {
    let pool = state.concepts;
    if (args.category) pool = pool.filter((c) => c.category === args.category);
    if (args.name_contains) {
      const needle = args.name_contains.toLowerCase();
      pool = pool.filter((c) => c.name.toLowerCase().includes(needle));
    }
    return {
      matches: pool.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        source_lessons: c.source_lessons,
      })),
      total_recorded: state.concepts.length,
    };
  },
} as const;

export const markModuleProcessedTool = {
  name: "mark_module_processed",
  description:
    "Mark a module as processed (you've extracted concepts/relationships/optimizations from it). Helps avoid re-reading.",
  inputSchema: z.object({ module_id: z.string() }),
  handler: async (args: { module_id: string }): Promise<{ marked: true; processed_so_far: string[] }> => {
    const padded = args.module_id.padStart(2, "0");
    state.modulesRead.add(padded);
    return { marked: true, processed_so_far: [...state.modulesRead] };
  },
} as const;

export const submitFinalReportTool = {
  name: "submit_final_report",
  description:
    "Submit the final synthesis report. Includes mindmap (Mermaid mindmap syntax), knowledge graph (Mermaid graph syntax), recommended learning paths, and key insights. Terminal: agent ends after this call. The runner aggregates this with all the previously-recorded data into output files.",
  inputSchema: z.object({
    summary: z.string().min(100).describe("100-300 word overview of what you learned and the course's overall shape."),
    mindmap_mermaid: z.string().min(20).describe("Mermaid 'mindmap' syntax, hierarchical from a root node."),
    knowledge_graph_mermaid: z.string().min(20).describe("Mermaid 'graph LR' syntax showing concept relationships."),
    learning_paths: z.array(z.object({
      name: z.string(),
      audience: z.string(),
      description: z.string(),
      lesson_sequence: z.array(z.string()).min(3),
      estimated_hours: z.number().positive(),
    })).min(1),
    key_insights: z.array(z.string()).min(3).describe("3-7 key insights you've drawn from reading the whole course."),
  }),
  handler: async (args: unknown): Promise<{ submitted: true; payload: unknown }> => {
    return { submitted: true, payload: args };
  },
} as const;

export const learnerTools: ToolRegistry = {
  list_course_modules: listCourseModulesTool,
  read_course_module: readCourseModuleTool,
  record_concept: recordConceptTool,
  record_relationship: recordRelationshipTool,
  record_optimization: recordOptimizationTool,
  get_recorded_concepts: getRecordedConceptsTool,
  mark_module_processed: markModuleProcessedTool,
  submit_final_report: submitFinalReportTool,
};

// ─── Output writer (used by run.ts after agent completes) ──────────

const CATEGORY_COLORS: Record<string, string> = {
  foundational: "#fee",
  architecture: "#def",
  operational: "#cfc",
  math: "#fdf",
  safety: "#fcc",
  business: "#ffe",
  frontier: "#dff",
};

export async function writeLearnerOutput(
  outputDir: string,
  finalReport: {
    summary: string;
    mindmap_mermaid: string;
    knowledge_graph_mermaid: string;
    learning_paths: { name: string; audience: string; description: string; lesson_sequence: string[]; estimated_hours: number }[];
    key_insights: string[];
  },
): Promise<{ writtenPaths: string[] }> {
  const writtenPaths: string[] = [];
  const dir = resolve(outputDir);
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, "knowledge-base"), { recursive: true });

  // 1. concepts.json
  await writeFile(join(dir, "concepts.json"), JSON.stringify(state.concepts, null, 2), "utf-8");
  writtenPaths.push(join(dir, "concepts.json"));

  // 2. relationships.json
  await writeFile(join(dir, "relationships.json"), JSON.stringify(state.relationships, null, 2), "utf-8");
  writtenPaths.push(join(dir, "relationships.json"));

  // 3. optimizations.md (grouped by priority)
  const optByPri: Record<string, Optimization[]> = { high: [], medium: [], low: [] };
  for (const o of state.optimizations) (optByPri[o.priority] ?? optByPri.medium).push(o);
  const optMd = [
    "# Course Optimization Suggestions",
    `Generated by the Learner Agent. ${state.optimizations.length} total.`,
    "",
    ...["high", "medium", "low"].flatMap((pri) => [
      `## ${pri.toUpperCase()} priority (${optByPri[pri].length})`,
      "",
      ...optByPri[pri].map((o, i) =>
        [
          `### ${i + 1}. [${o.type}] Lessons ${o.target_lessons.join(", ")}`,
          `- **Current:** ${o.current_state}`,
          `- **Suggestion:** ${o.suggestion}`,
          `- **Why:** ${o.rationale}`,
          "",
        ].join("\n"),
      ),
    ]),
  ].join("\n");
  await writeFile(join(dir, "optimizations.md"), optMd, "utf-8");
  writtenPaths.push(join(dir, "optimizations.md"));

  // 4. mindmap.mmd
  await writeFile(join(dir, "mindmap.mmd"), finalReport.mindmap_mermaid, "utf-8");
  writtenPaths.push(join(dir, "mindmap.mmd"));

  // 5. knowledge-graph.mmd
  await writeFile(join(dir, "knowledge-graph.mmd"), finalReport.knowledge_graph_mermaid, "utf-8");
  writtenPaths.push(join(dir, "knowledge-graph.mmd"));

  // 6. learning-paths.md
  const pathMd = [
    "# Recommended Learning Paths",
    "",
    ...finalReport.learning_paths.map((p, i) =>
      [
        `## ${i + 1}. ${p.name}`,
        `**Audience:** ${p.audience}  ·  **Time:** ~${p.estimated_hours} hours`,
        "",
        p.description,
        "",
        "**Lessons in order:**",
        ...p.lesson_sequence.map((l) => `1. Lesson ${l}`),
        "",
      ].join("\n"),
    ),
  ].join("\n");
  await writeFile(join(dir, "learning-paths.md"), pathMd, "utf-8");
  writtenPaths.push(join(dir, "learning-paths.md"));

  // 7. summary.md
  const summaryMd = [
    "# Learner Agent Report",
    "",
    "## Summary",
    finalReport.summary,
    "",
    "## Key insights",
    ...finalReport.key_insights.map((k) => `- ${k}`),
    "",
    `## Statistics`,
    `- Modules processed: ${state.modulesRead.size}`,
    `- Concepts extracted: ${state.concepts.length}`,
    `- Relationships identified: ${state.relationships.length}`,
    `- Optimization suggestions: ${state.optimizations.length}`,
    `- Learning paths recommended: ${finalReport.learning_paths.length}`,
  ].join("\n");
  await writeFile(join(dir, "summary.md"), summaryMd, "utf-8");
  writtenPaths.push(join(dir, "summary.md"));

  // 8. knowledge-base/<concept-id>.md (one per concept)
  for (const c of state.concepts) {
    const related = state.relationships
      .filter((r) => r.from === c.id || r.to === c.id)
      .map((r) => r.from === c.id ? `- ${r.type} → \`${r.to}\` (${r.reason})` : `- ${r.type} ← \`${r.from}\` (${r.reason})`);
    const md = [
      `---`,
      `id: ${c.id}`,
      `name: "${c.name}"`,
      `category: ${c.category}`,
      `importance: ${c.importance}`,
      `source_lessons: [${c.source_lessons.join(", ")}]`,
      `---`,
      "",
      `# ${c.name}`,
      "",
      `**Category:** ${c.category}  ·  **Importance:** ${c.importance}/10`,
      `**Introduced in:** ${c.source_lessons.map((l) => `Lesson ${l}`).join(", ")}`,
      "",
      "## Definition",
      c.definition,
      "",
      ...(c.notes ? ["## Notes", c.notes, ""] : []),
      ...(related.length > 0 ? ["## Related concepts", ...related, ""] : []),
    ].join("\n");
    await writeFile(join(dir, "knowledge-base", `${c.id}.md`), md, "utf-8");
  }
  writtenPaths.push(join(dir, "knowledge-base"));

  // 9. Color legend for the knowledge-graph (handy for understanding categories)
  const legend = [
    "# Color legend for knowledge-graph.mmd",
    "",
    "Category colours (apply via mermaid classDef):",
    "",
    ...Object.entries(CATEGORY_COLORS).map(([cat, color]) => `- **${cat}** — ${color}`),
  ].join("\n");
  await writeFile(join(dir, "color-legend.md"), legend, "utf-8");
  writtenPaths.push(join(dir, "color-legend.md"));

  return { writtenPaths };
}

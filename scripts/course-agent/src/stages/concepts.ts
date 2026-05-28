import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CONCEPTS } from "../../../capstones/src/scorer/concepts-seed.js";
import { CONCEPT_DEFINITIONS } from "../concept-definitions.js";
import type { StageResult } from "../schema.js";

interface ConceptsInput {
  webDir: string;       // e.g. "course/web"
  courseDir: string;    // e.g. "course"
}

interface ConceptPageData {
  id: string;
  name: string;
  module: string;       // "M1"..."M14"
  moduleNum: number;
  category: string;
  importance: number;
  definition: string;
  prereqs: PrereqLink[];
  related: PrereqLink[];
  lessons: LessonLink[];
}

interface PrereqLink { id: string; name: string; module: string; }
interface LessonLink { id: string; moduleNum: number; }

const MODULE_TITLES: Record<string, string> = {
  M1: "Foundations",
  M2: "Math & Decision Theory",
  M3: "LLM Internals",
  M4: "Single-Agent Sherpa",
  M5: "Memory & Retrieval",
  M6: "Multi-Agent Systems",
  M7: "Tools & MCP",
  M8: "Evaluation & Observability",
  M9: "Production Engineering",
  M10: "Safety, Alignment & Security",
  M11: "Business Cases",
  M12: "Advanced Designs",
  M13: "Frontier & Governance",
  M14: "Claude-Specific Architect",
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  foundational: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a" },
  math:         { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
  architecture: { bg: "#dcfce7", border: "#16a34a", text: "#14532d" },
  operational:  { bg: "#ffedd5", border: "#c2410c", text: "#7c2d12" },
  safety:       { bg: "#fee2e2", border: "#b91c1c", text: "#7f1d1d" },
  business:     { bg: "#fef3c7", border: "#b45309", text: "#78350f" },
  frontier:     { bg: "#fce7f3", border: "#be185d", text: "#831843" },
};

export async function runConceptsStage(input: ConceptsInput): Promise<StageResult> {
  const warnings: string[] = [];
  try {
    const outDir = join(input.webDir, "concepts");
    await mkdir(outDir, { recursive: true });

    const pages = buildConceptPages(warnings);

    const outputs: string[] = [];
    for (const page of pages) {
      const path = join(outDir, `${page.id}.html`);
      await writeFile(path, renderConceptPage(page, pages), "utf-8");
      outputs.push(path);
    }

    const indexPath = join(outDir, "index.html");
    await writeFile(indexPath, renderConceptIndex(pages), "utf-8");
    outputs.push(indexPath);

    return { stage: "concepts", ok: true, outputs, warnings };
  } catch (err) {
    return {
      stage: "concepts",
      ok: false,
      outputs: [],
      warnings,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runBookCoverStage(input: ConceptsInput): Promise<StageResult> {
  const warnings: string[] = [];
  try {
    const pages = buildConceptPages(warnings);
    const modules = await loadModuleSummaries(input.courseDir);

    const coverPath = join(input.webDir, "book.html");
    await writeFile(coverPath, renderBookCover(modules, pages), "utf-8");

    return { stage: "book", ok: true, outputs: [coverPath], warnings };
  } catch (err) {
    return {
      stage: "book",
      ok: false,
      outputs: [],
      warnings,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── data assembly ────────────────────────────────────────────────────

function buildConceptPages(warnings: string[]): ConceptPageData[] {
  const conceptIndex = new Map<string, { name: string; module: string }>();
  for (const c of SEED_CONCEPTS) {
    conceptIndex.set(c.concept_id, { name: c.name, module: c.module });
  }

  const pages: ConceptPageData[] = [];
  for (const c of SEED_CONCEPTS) {
    const def = CONCEPT_DEFINITIONS[c.concept_id];
    if (!def) {
      warnings.push(`No definition for concept ${c.concept_id}`);
      continue;
    }
    const moduleNum = Number(c.module.replace("M", ""));
    pages.push({
      id: c.concept_id,
      name: c.name,
      module: c.module,
      moduleNum,
      category: c.category,
      importance: c.importance,
      definition: def.definition,
      prereqs: def.prereqs.map((id) => toLink(id, conceptIndex)).filter(nonNull),
      related: def.related.map((id) => toLink(id, conceptIndex)).filter(nonNull),
      lessons: def.lessons.map((id) => ({ id, moduleNum: Number(id.split(".")[0]) })),
    });
  }
  return pages.sort((a, b) => a.moduleNum - b.moduleNum || b.importance - a.importance);
}

function toLink(id: string, idx: Map<string, { name: string; module: string }>): PrereqLink | null {
  const entry = idx.get(id);
  if (!entry) return null;
  return { id, name: entry.name, module: entry.module };
}

function nonNull<T>(v: T | null): v is T { return v !== null; }

async function loadModuleSummaries(courseDir: string): Promise<Array<{ num: number; title: string; subtitle: string; lessons: { id: string; title: string }[] }>> {
  const files = [
    "module-01-foundations.md", "module-02-math.md", "module-03-llm-internals.md",
    "module-04-single-agent.md", "module-05-memory-retrieval.md", "module-06-multi-agent.md",
    "module-07-tools-mcp.md", "module-08-evaluation.md", "module-09-production.md",
    "module-10-safety-security.md", "module-11-business-cases.md", "module-12-advanced-designs.md",
    "module-13-future.md", "module-14-claude-architect.md",
  ];
  const out: Array<{ num: number; title: string; subtitle: string; lessons: { id: string; title: string }[] }> = [];
  for (const f of files) {
    const md = await readFile(join(courseDir, f), "utf-8");
    const num = Number(f.match(/module-(\d+)/)?.[1] ?? 0);
    const titleM = md.match(/^# Module \d+ — (.+)$/m);
    const subM = md.match(/^>\s*\*\*Module length:\*\*\s*([^\n]+)/m);
    const lessons: { id: string; title: string }[] = [];
    const re = /^# Lesson (\d+\.\d+)\s+[—-]\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) lessons.push({ id: m[1], title: m[2].trim() });
    out.push({ num, title: titleM?.[1]?.trim() ?? `Module ${num}`, subtitle: subM?.[1]?.trim() ?? "", lessons });
  }
  return out;
}

// ─── rendering ────────────────────────────────────────────────────────

function commonStyles(): string {
  return `
:root {
  --bg: #fafafa; --surface: #ffffff;
  --text: #1c2230; --text-muted: #5b6473;
  --border: #e5e7eb; --accent: #2563eb; --accent-soft: #eff6ff;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  font-size: 17px; line-height: 1.65; color: var(--text); background: var(--bg); }
.container { max-width: 880px; margin: 0 auto; padding: 32px; }
.breadcrumb { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.breadcrumb a { color: var(--text-muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent); text-decoration: underline; }
.breadcrumb .sep { margin: 0 6px; opacity: 0.5; }
.hero { padding: 36px 32px; background: linear-gradient(135deg, #1c2230 0%, #2d3a55 100%);
  color: #fff; border-radius: 14px; margin-bottom: 28px; }
.hero h1 { margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
.hero p { margin: 0; opacity: 0.85; font-size: 16px; }
.hero .meta { font-size: 13px; opacity: 0.75; margin-top: 10px; }
.badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
  padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
h2.section { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-muted); margin: 28px 0 10px; font-weight: 700; }
.card { background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 18px 22px; margin-bottom: 12px;
  display: block; text-decoration: none; color: inherit; transition: border-color 0.15s; }
.card:hover { border-color: var(--accent); }
.card-title { font-weight: 700; font-size: 16px; margin: 0 0 4px; }
.card-sub { color: var(--text-muted); font-size: 13px; margin: 0; }
.def { background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 22px 26px; margin-bottom: 24px; font-size: 17px; line-height: 1.7; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.chip { display: inline-block; padding: 4px 10px; border-radius: 6px;
  background: var(--accent-soft); color: var(--accent); font-size: 13px;
  text-decoration: none; border: 1px solid transparent; }
.chip:hover { border-color: var(--accent); }
.chip.muted { background: #f3f4f6; color: var(--text-muted); }
.module-pill { display: inline-block; padding: 2px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 700; background: #e5e7eb; color: #374151;
  margin-right: 8px; font-variant-numeric: tabular-nums; }
.import-bar { display: inline-flex; gap: 2px; vertical-align: middle; margin-left: 8px; }
.import-bar span { width: 6px; height: 12px; background: #e5e7eb; border-radius: 2px; }
.import-bar span.on { background: #f59e0b; }
.group-header { display: flex; align-items: baseline; gap: 12px; margin: 28px 0 12px;
  padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.group-header h3 { margin: 0; font-size: 18px; font-weight: 700; }
.group-header .count { color: var(--text-muted); font-size: 13px; }
.lesson-link { display: inline-block; margin-right: 8px; padding: 3px 9px;
  background: var(--accent-soft); color: var(--accent); border-radius: 6px;
  font-size: 13px; text-decoration: none; font-variant-numeric: tabular-nums; }
.lesson-link:hover { background: var(--accent); color: #fff; }
.toc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
`;
}

function categoryStyle(category: string): string {
  const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.architecture;
  return `background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};`;
}

function importanceBar(n: number): string {
  const cells = Array.from({ length: 10 }, (_, i) => `<span class="${i < n ? "on" : ""}"></span>`).join("");
  return `<span class="import-bar" title="Importance ${n}/10">${cells}</span>`;
}

function renderConceptPage(p: ConceptPageData, all: ConceptPageData[]): string {
  // Where else this concept appears (other concepts that list this as prereq/related).
  const usedBy = all
    .filter((o) => o.id !== p.id && (o.prereqs.some((x) => x.id === p.id) || o.related.some((x) => x.id === p.id)))
    .slice(0, 8);

  const moduleSlug = `m${String(p.moduleNum).padStart(2, "0")}`;
  const lessonsHtml = p.lessons.length === 0
    ? `<p class="card-sub">No lesson references yet.</p>`
    : p.lessons.map((l) => `<a class="lesson-link" href="../${`m${String(l.moduleNum).padStart(2, "0")}`}/lesson-${l.id}.html">§${l.id}</a>`).join("");

  const prereqsHtml = p.prereqs.length === 0
    ? `<p class="card-sub">None — this is a foundational concept.</p>`
    : `<div class="chips">${p.prereqs.map((x) => `<a class="chip" href="${x.id}.html">${escape(x.name)}</a>`).join("")}</div>`;

  const relatedHtml = p.related.length === 0
    ? `<p class="card-sub">No directly related concepts listed.</p>`
    : `<div class="chips">${p.related.map((x) => `<a class="chip" href="${x.id}.html">${escape(x.name)}</a>`).join("")}</div>`;

  const usedByHtml = usedBy.length === 0
    ? `<p class="card-sub">No other concepts depend on this one.</p>`
    : `<div class="chips">${usedBy.map((x) => `<a class="chip muted" href="${x.id}.html">${escape(x.name)}</a>`).join("")}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(p.name)} · Concept · AdaptLearn</title>
  <style>${commonStyles()}
.cat-tag { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; ${categoryStyle(p.category)} }
  </style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../book.html">Book</a>
      <span class="sep">›</span>
      <a href="index.html">Concepts</a>
      <span class="sep">›</span>
      <span>${escape(p.name)}</span>
    </nav>

    <header class="hero">
      <h1>${escape(p.name)}</h1>
      <p>From <a href="../${moduleSlug}/index.html" style="color:#fff;text-decoration:underline;">Module ${p.moduleNum} — ${escape(MODULE_TITLES[p.module] ?? "")}</a></p>
      <div class="badges">
        <span class="badge">${p.module}</span>
        <span class="badge">${escape(p.category)}</span>
        <span class="badge">importance ${p.importance}/10</span>
      </div>
    </header>

    <h2 class="section">Definition</h2>
    <div class="def">${escape(p.definition)}</div>

    <h2 class="section">Where it's covered</h2>
    <div class="card">${lessonsHtml}</div>

    <h2 class="section">Prerequisites</h2>
    <div class="card">${prereqsHtml}</div>

    <h2 class="section">Related concepts</h2>
    <div class="card">${relatedHtml}</div>

    <h2 class="section">Used by</h2>
    <div class="card">${usedByHtml}</div>
  </div>
</body>
</html>
`;
}

function renderConceptIndex(pages: ConceptPageData[]): string {
  const byModule = new Map<string, ConceptPageData[]>();
  for (const p of pages) {
    if (!byModule.has(p.module)) byModule.set(p.module, []);
    byModule.get(p.module)!.push(p);
  }

  const groupsHtml = Array.from(byModule.entries())
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([modKey, concepts]) => {
      const moduleNum = Number(modKey.slice(1));
      const moduleSlug = `m${String(moduleNum).padStart(2, "0")}`;
      const cards = concepts.map((c) => `      <a class="card" href="${c.id}.html">
        <span class="module-pill">${c.module}</span>
        <span class="card-title">${escape(c.name)}</span>
        ${importanceBar(c.importance)}
        <p class="card-sub">${escape(c.definition.slice(0, 140))}${c.definition.length > 140 ? "…" : ""}</p>
      </a>`).join("\n");
      return `    <div class="group-header">
      <h3><a href="../${moduleSlug}/index.html" style="color:inherit;text-decoration:none;">${modKey} — ${escape(MODULE_TITLES[modKey] ?? "")}</a></h3>
      <span class="count">${concepts.length} concepts</span>
    </div>
${cards}`;
    }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Concept Reference · AdaptLearn</title>
  <style>${commonStyles()}</style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../book.html">Book</a>
      <span class="sep">›</span>
      <span>Concepts</span>
    </nav>
    <header class="hero">
      <h1>Concept Reference</h1>
      <p>All ${pages.length} concepts from the course, grouped by module. Each links to its lessons, prerequisites, and related concepts.</p>
      <p class="meta">${pages.length} concepts · 14 modules</p>
    </header>

${groupsHtml}
  </div>
</body>
</html>
`;
}

function renderBookCover(
  modules: Array<{ num: number; title: string; subtitle: string; lessons: { id: string; title: string }[] }>,
  pages: ConceptPageData[],
): string {
  const moduleCards = modules.map((m) => {
    const slug = `m${String(m.num).padStart(2, "0")}`;
    return `      <a class="card" href="${slug}/index.html">
        <span class="module-pill">M${m.num}</span>
        <span class="card-title">${escape(m.title)}</span>
        <p class="card-sub">${escape(m.subtitle)} · ${m.lessons.length} lessons</p>
      </a>`;
  }).join("\n");

  const conceptCount = pages.length;
  const lessonCount = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Agentic Systems Book · AdaptLearn</title>
  <style>${commonStyles()}
.section-card { background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 24px 28px; margin-bottom: 16px;
  display: block; text-decoration: none; color: inherit; transition: border-color 0.15s; }
.section-card:hover { border-color: var(--accent); }
.section-card h3 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
.section-card p { margin: 0; color: var(--text-muted); font-size: 14px; }
.section-card .arrow { float: right; color: var(--accent); font-size: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <header class="hero">
      <h1>The Agentic Systems Book</h1>
      <p>A complete reference for designing, building, and shipping LLM agents.</p>
      <p class="meta">14 modules · ${lessonCount} lessons · ${conceptCount} concepts · 3 capstones · 1 cert curriculum</p>
    </header>

    <h2 class="section">How to read this book</h2>
    <a class="section-card" href="index.html">
      <span class="arrow">→</span>
      <h3>📖 Linear path — Modules &amp; Lessons</h3>
      <p>Start at Module 1, work through to Module 14. The original course flow.</p>
    </a>
    <a class="section-card" href="concepts/index.html">
      <span class="arrow">→</span>
      <h3>🔎 Reference — Concept Index</h3>
      <p>${conceptCount} atomic concepts, each with definition, prereqs, related, and source lessons. Browse or jump in.</p>
    </a>
    <a class="section-card" href="curriculum-claude-architect.html">
      <span class="arrow">→</span>
      <h3>🎯 Curriculum — Claude Architect Foundations</h3>
      <p>6-week structured study plan for Anthropic's certification exam.</p>
    </a>
    <a class="section-card" href="capstones/index.html">
      <span class="arrow">→</span>
      <h3>🛠️ Practice — Capstone projects</h3>
      <p>Three integrated end-to-end builds that exercise the full course.</p>
    </a>

    <h2 class="section">Modules at a glance</h2>
    <div class="toc-grid">
${moduleCards}
    </div>
  </div>
</body>
</html>
`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

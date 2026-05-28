import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

interface ModuleInfo {
  num: number;
  filename: string;
  title: string;
  subtitle: string;
  lessons: { id: string; title: string }[];
}

interface BuildIndicesInput {
  courseDir: string;
  webDir: string;
}

const MODULE_FILES = [
  "module-01-foundations.md",
  "module-02-math.md",
  "module-03-llm-internals.md",
  "module-04-single-agent.md",
  "module-05-memory-retrieval.md",
  "module-06-multi-agent.md",
  "module-07-tools-mcp.md",
  "module-08-evaluation.md",
  "module-09-production.md",
  "module-10-safety-security.md",
  "module-11-business-cases.md",
  "module-12-advanced-designs.md",
  "module-13-future.md",
  "module-14-claude-architect.md",
];

export async function buildIndices(input: BuildIndicesInput): Promise<void> {
  const modules: ModuleInfo[] = [];
  for (const fname of MODULE_FILES) {
    const path = join(input.courseDir, fname);
    const md = await readFile(path, "utf-8");
    const moduleNumMatch = fname.match(/module-(\d+)/);
    if (!moduleNumMatch) continue;
    const num = Number(moduleNumMatch[1]);

    const titleMatch = md.match(/^# Module \d+ — (.+)$/m);
    const subtitleMatch = md.match(/^>\s*\*\*Module length:\*\*\s*([^\n]+)/m);
    const title = titleMatch ? titleMatch[1].trim() : `Module ${num}`;
    const subtitle = subtitleMatch ? subtitleMatch[1].trim().replace(/[·]/g, "·") : "";

    const lessons: { id: string; title: string }[] = [];
    const re = /^# Lesson (\d+\.\d+)\s+[—-]\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      lessons.push({ id: m[1], title: m[2].trim() });
    }

    modules.push({ num, filename: fname, title, subtitle, lessons });
  }

  await writeFile(join(input.webDir, "index.html"), renderRootIndex(modules), "utf-8");

  for (const mod of modules) {
    const dir = join(input.webDir, `m${String(mod.num).padStart(2, "0")}`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), renderModuleIndex(mod), "utf-8");
  }

  // Capstones page
  const capstonesPath = join(input.courseDir, "capstones.md");
  try {
    const capMd = await readFile(capstonesPath, "utf-8");
    await mkdir(join(input.webDir, "capstones"), { recursive: true });
    await writeFile(join(input.webDir, "capstones", "index.html"), renderCapstonesPage(capMd), "utf-8");
  } catch {
    // capstones file not present; skip
  }
}

function commonStyles(): string {
  return `
:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --text: #1c2230;
  --text-muted: #5b6473;
  --border: #e5e7eb;
  --accent: #2563eb;
  --accent-soft: #eff6ff;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  font-size: 17px;
  line-height: 1.65;
  color: var(--text);
  background: var(--bg);
}
.container { max-width: 920px; margin: 0 auto; padding: 32px; }
.hero { padding: 48px 32px; background: linear-gradient(135deg, #1c2230 0%, #2d3a55 100%); color: #fff; border-radius: 16px; margin-bottom: 32px; }
.hero h1 { margin: 0 0 8px; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; }
.hero p { margin: 0; opacity: 0.85; font-size: 17px; }
.meta { font-size: 13px; opacity: 0.75; margin-top: 12px; }
.breadcrumb { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.breadcrumb a { color: var(--text-muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent); text-decoration: underline; }
.breadcrumb .sep { margin: 0 6px; opacity: 0.5; }
.module-card, .lesson-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 14px;
  transition: border-color 0.15s, transform 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}
.module-card:hover, .lesson-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.module-num, .lesson-num {
  display: inline-block;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  margin-right: 10px;
  font-variant-numeric: tabular-nums;
}
.module-title, .lesson-title { font-weight: 700; font-size: 17px; margin: 0 0 4px; }
.module-subtitle, .lesson-subtitle { color: var(--text-muted); font-size: 14px; margin: 4px 0 0; }
.module-lessons-summary { color: var(--text-muted); font-size: 13px; margin-top: 8px; }
h2.section { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin: 28px 0 12px; }
.capstones-card { background: linear-gradient(135deg, #fdf6f0 0%, #fff 100%); border-left: 4px solid #ec4899; }
.capstones-card .module-title { color: #ec4899; }
`;
}

function renderRootIndex(modules: ModuleInfo[]): string {
  const moduleHtml = modules
    .map((m) => {
      const slug = `m${String(m.num).padStart(2, "0")}`;
      return `      <a class="module-card" href="${slug}/index.html">
        <span class="module-num">M${m.num}</span>
        <span class="module-title">${escape(m.title)}</span>
        <p class="module-subtitle">${escape(m.subtitle)}</p>
        <p class="module-lessons-summary">${m.lessons.length} lessons · ${m.lessons.map((l) => l.id).join(" · ")}</p>
      </a>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agentic Systems Course · AdaptLearn</title>
  <style>${commonStyles()}</style>
</head>
<body>
  <div class="container">
    <header class="hero">
      <h1>Agentic Systems</h1>
      <p>An advanced course on designing, building, and deploying LLM agents in production.</p>
      <p class="meta">14 modules · 55 lessons · 63 concepts · 3 capstones · ~130 hours</p>
    </header>

    <a class="module-card" href="book.html" style="background: linear-gradient(135deg, #fef3c7 0%, #fff 100%); border-left: 4px solid #f59e0b;">
      <span class="module-num" style="background: #fef3c7; color: #b45309;">BOOK</span>
      <span class="module-title">📖 Open as a book — modules, concepts, curriculum, capstones</span>
      <p class="module-subtitle">Reference-style entry point with concept index, curriculum tracks, and cross-linked pages.</p>
    </a>

    <h2 class="section">Modules</h2>
${moduleHtml}

    <h2 class="section">Capstones</h2>
    <a class="module-card capstones-card" href="capstones/index.html">
      <span class="module-num">C</span>
      <span class="module-title">Capstone Projects</span>
      <p class="module-subtitle">3 end-to-end projects: coding agent · research agent · domain multi-agent</p>
    </a>
  </div>
</body>
</html>
`;
}

function renderModuleIndex(mod: ModuleInfo): string {
  const lessons = mod.lessons
    .map(
      (l) => `      <a class="lesson-card" href="lesson-${l.id}.html">
        <span class="lesson-num">§${l.id}</span>
        <span class="lesson-title">${escape(l.title)}</span>
      </a>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Module ${mod.num} · ${escape(mod.title)} · AdaptLearn</title>
  <style>${commonStyles()}</style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../index.html">AdaptLearn</a>
      <span class="sep">›</span>
      <span>Module ${mod.num}</span>
    </nav>
    <header class="hero">
      <h1>Module ${mod.num} — ${escape(mod.title)}</h1>
      <p>${escape(mod.subtitle)}</p>
      <p class="meta">${mod.lessons.length} lessons</p>
    </header>

    <h2 class="section">Lessons</h2>
${lessons}
  </div>
</body>
</html>
`;
}

function renderCapstonesPage(_capMd: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Capstones · AdaptLearn</title>
  <style>${commonStyles()}</style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../index.html">AdaptLearn</a>
      <span class="sep">›</span>
      <span>Capstones</span>
    </nav>
    <header class="hero">
      <h1>Capstone Projects</h1>
      <p>Three integrated end-to-end projects that exercise everything from Modules 1–13.</p>
    </header>

    <h2 class="section">Projects</h2>
    <div class="lesson-card">
      <span class="lesson-num">C1</span>
      <span class="lesson-title">Build a Coding Agent</span>
      <p class="module-subtitle">Given a GitHub issue, produce a working PR. Target: 30% pass rate. 20–40 hours.</p>
    </div>
    <div class="lesson-card">
      <span class="lesson-num">C2</span>
      <span class="lesson-title">Build a Research Agent</span>
      <p class="module-subtitle">Synthesise findings from primary sources with verifiable citations. Target: 80% citation faithfulness. 20–40 hours.</p>
    </div>
    <div class="lesson-card">
      <span class="lesson-num">C3</span>
      <span class="lesson-title">Build a Domain Multi-Agent System</span>
      <p class="module-subtitle">Three-agent system for a real domain in your org. Full production discipline. 40–80 hours.</p>
    </div>

    <p style="color: var(--text-muted); font-size: 14px; margin-top: 24px;">Full briefs in <code>course/capstones.md</code>.</p>
  </div>
</body>
</html>
`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

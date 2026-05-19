import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, relative, resolve, posix } from "node:path";
import { marked } from "marked";
import { extractLesson } from "../markdown-parser.js";
import type { ParsedLesson, Section, StageResult } from "../schema.js";

export interface WebInput {
  markdownPath: string;
  lessonId: string;
  outPath: string;
}

export async function runWebStage(input: WebInput): Promise<StageResult> {
  const warnings: string[] = [];
  try {
    const md = await readFile(input.markdownPath, "utf-8");
    const lesson = extractLesson(md, input.lessonId);

    const mdDir = dirname(resolve(input.markdownPath));
    const outDir = dirname(resolve(input.outPath));
    const lessonForWeb = rewriteImagePaths(lesson, mdDir, outDir);

    const html = renderLessonPage(lessonForWeb);

    await mkdir(outDir, { recursive: true });
    await writeFile(input.outPath, html, "utf-8");

    return {
      stage: "web",
      ok: true,
      outputs: [input.outPath],
      warnings,
    };
  } catch (err) {
    return {
      stage: "web",
      ok: false,
      outputs: [],
      warnings,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function rewriteImagePaths(lesson: ParsedLesson, mdDir: string, outDir: string): ParsedLesson {
  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const fixOne = (body: string) =>
    body.replace(imgRe, (_match, alt: string, src: string) => {
      if (/^(https?:|data:|\/)/.test(src)) return `![${alt}](${src})`;
      const absoluteSrc = resolve(mdDir, src);
      const rel = relative(outDir, absoluteSrc).split(/[\\/]/).join(posix.sep);
      return `![${alt}](${rel})`;
    });
  return {
    ...lesson,
    sections: lesson.sections.map((s) => ({ ...s, body: fixOne(s.body) })),
    ...(lesson.intro && { intro: fixOne(lesson.intro) }),
  };
}

const SECTION_TITLES: Record<number, string> = {
  0: "Orientation",
  1: "Business Scenario",
  2: "Bridge to Topic",
  3: "Mind Map",
  4: "Elaboration",
  5: "Problem Statement",
  6: "Solution Walkthrough",
  7: "Mathematical Foundation",
  8: "Technical Deep-Dive",
  9: "What This Unlocks",
};

const SECTION_THEMES: Record<number, string> = {
  0: "orient",
  1: "scenario",
  2: "bridge",
  3: "mindmap",
  4: "elaboration",
  5: "problem",
  6: "solution",
  7: "math",
  8: "tech",
  9: "unlocks",
};

const SECTION_ICONS: Record<number, string> = {
  0: "🧭",
  1: "🏢",
  2: "🔗",
  3: "🗺️",
  4: "📖",
  5: "❓",
  6: "🛠️",
  7: "∑",
  8: "⚙️",
  9: "🚀",
};

function renderLessonPage(lesson: ParsedLesson): string {
  marked.setOptions({ gfm: true, breaks: false });

  const sectionsSorted = [...lesson.sections].sort((a, b) => a.number - b.number);

  const tocItems = sectionsSorted
    .map((s) => {
      const title = SECTION_TITLES[s.number] ?? s.title;
      return `      <li><a href="#section-${s.number}" data-section="${s.number}"><span class="toc-num">§${s.number}</span><span class="toc-title">${escapeHtml(title)}</span></a></li>`;
    })
    .join("\n");

  const introHtml = lesson.intro
    ? `      <section class="intro" id="section-intro">
        <header class="section-header">
          <span class="section-icon">📍</span>
          <h2>How to use this lesson</h2>
        </header>
        <div class="section-body">
${marked.parse(lesson.intro) as string}
        </div>
      </section>`
    : "";

  const sectionsHtml = sectionsSorted
    .map((s) => renderSection(s))
    .join("\n\n");

  const moduleNum = lesson.id.split(".")[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lesson ${escapeHtml(lesson.id)} · ${escapeHtml(lesson.title)} · AdaptLearn</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/atom-one-light.css" />
  <style>${getStyles()}</style>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="page-header">
    <div class="page-header-inner">
      <nav class="breadcrumb">
        <a href="../../index.html">AdaptLearn</a>
        <span class="sep">›</span>
        <a href="../index.html">Module ${escapeHtml(moduleNum)}</a>
        <span class="sep">›</span>
        <span class="current">Lesson ${escapeHtml(lesson.id)}</span>
      </nav>
      <h1 class="page-title">${escapeHtml(lesson.title)}</h1>
      <div class="page-meta">
        <span>Lesson ${escapeHtml(lesson.id)}</span>
        <span class="dot">·</span>
        <span>${sectionsSorted.length} sections</span>
        <span class="dot">·</span>
        <span>~25 min read</span>
      </div>
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
  </header>

  <div class="layout">
    <aside class="sidebar">
      <nav class="toc" aria-label="Lesson sections">
        <h3>Sections</h3>
        <ol>
${tocItems}
        </ol>
      </nav>
    </aside>

    <main id="main" class="content">
${introHtml}
${sectionsHtml}

      <footer class="lesson-footer">
        <p>End of Lesson ${escapeHtml(lesson.id)}</p>
        <p class="muted">Press <kbd>↑</kbd> / <kbd>↓</kbd> to jump between sections.</p>
      </footer>
    </main>
  </div>

  <script defer src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/highlight.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}], throwOnError:false});"></script>
  <script>${getClientScript()}</script>
</body>
</html>
`;
}

function renderSection(s: Section): string {
  const title = SECTION_TITLES[s.number] ?? s.title;
  const theme = SECTION_THEMES[s.number] ?? "default";
  const icon = SECTION_ICONS[s.number] ?? "•";
  const body = marked.parse(s.body) as string;
  return `      <section id="section-${s.number}" class="lesson-section" data-theme="${theme}" data-section="${s.number}">
        <header class="section-header">
          <span class="section-icon" aria-hidden="true">${icon}</span>
          <span class="section-badge">§${s.number}</span>
          <h2>${escapeHtml(title)}</h2>
        </header>
        <div class="section-body">
${body}
        </div>
      </section>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getStyles(): string {
  return `
:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --text: #1c2230;
  --text-muted: #5b6473;
  --border: #e5e7eb;
  --accent: #2563eb;
  --accent-soft: #eff6ff;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  --font-mono: "SF Mono", Monaco, Consolas, "Liberation Mono", monospace;
  --max-content: 760px;
  --sidebar-w: 280px;
  --header-h: 120px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: var(--header-h); }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 17px;
  line-height: 1.65;
  color: var(--text);
  background: var(--bg);
}

.skip {
  position: absolute; left: -9999px;
  background: var(--accent); color: #fff; padding: 8px 12px; z-index: 100;
}
.skip:focus { left: 12px; top: 12px; }

.page-header {
  position: sticky; top: 0; z-index: 10;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
  background: rgba(255,255,255,0.92);
}
.page-header-inner {
  max-width: calc(var(--max-content) + var(--sidebar-w) + 80px);
  margin: 0 auto; padding: 14px 32px;
}
.breadcrumb {
  font-size: 13px; color: var(--text-muted);
  margin-bottom: 4px;
}
.breadcrumb a { color: var(--text-muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent); text-decoration: underline; }
.breadcrumb .sep { margin: 0 6px; opacity: 0.5; }
.breadcrumb .current { color: var(--text); font-weight: 500; }
.page-title { margin: 0 0 6px; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; }
.page-meta { font-size: 13px; color: var(--text-muted); }
.page-meta .dot { margin: 0 8px; opacity: 0.5; }

.progress-bar { height: 3px; background: var(--border); }
.progress-fill { height: 100%; background: var(--accent); width: 0%; transition: width 0.1s linear; }

.layout {
  max-width: calc(var(--max-content) + var(--sidebar-w) + 80px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  gap: 40px;
  padding: 32px;
}

.sidebar { position: sticky; top: calc(var(--header-h) + 16px); align-self: start; max-height: calc(100vh - var(--header-h) - 32px); overflow-y: auto; }
.toc h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin: 0 0 8px; }
.toc ol { list-style: none; padding: 0; margin: 0; }
.toc li { margin: 0; }
.toc a {
  display: flex; align-items: baseline; gap: 8px;
  padding: 6px 10px; border-radius: 6px;
  color: var(--text-muted); text-decoration: none; font-size: 14px;
  border-left: 2px solid transparent;
}
.toc a:hover { background: var(--accent-soft); color: var(--text); }
.toc a.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; border-left-color: var(--accent); }
.toc-num { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 12px; color: var(--text-muted); }
.toc a.active .toc-num { color: var(--accent); }

.content { min-width: 0; max-width: var(--max-content); }

.intro, .lesson-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px 32px;
  margin-bottom: 28px;
  scroll-margin-top: var(--header-h);
}
.lesson-section[data-theme="scenario"]    { border-left: 4px solid #ef4444; }
.lesson-section[data-theme="bridge"]      { border-left: 4px solid #94a3b8; }
.lesson-section[data-theme="mindmap"]     { border-left: 4px solid #8b5cf6; }
.lesson-section[data-theme="elaboration"] { border-left: 4px solid #2563eb; }
.lesson-section[data-theme="problem"]     { border-left: 4px solid #f59e0b; }
.lesson-section[data-theme="solution"]    { border-left: 4px solid #10b981; }
.lesson-section[data-theme="math"]        { border-left: 4px solid #6366f1; }
.lesson-section[data-theme="tech"]        { border-left: 4px solid #64748b; }
.lesson-section[data-theme="unlocks"]     { border-left: 4px solid #ec4899; }
.lesson-section[data-theme="orient"]      { border-left: 4px solid #0ea5e9; }
.intro { border-left: 4px solid #0ea5e9; }

.section-header {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 12px; margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.section-icon { font-size: 22px; }
.section-badge {
  background: var(--accent-soft); color: var(--accent);
  padding: 2px 8px; border-radius: 999px;
  font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.section-header h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }

.section-body h3 { margin-top: 32px; font-size: 18px; font-weight: 700; }
.section-body h4 { margin-top: 24px; font-size: 16px; font-weight: 600; color: var(--text-muted); }
.section-body p { margin: 12px 0; }
.section-body ul, .section-body ol { margin: 12px 0; padding-left: 24px; }
.section-body li { margin: 4px 0; }

.section-body a { color: var(--accent); text-decoration: underline; text-decoration-color: rgba(37,99,235,0.3); text-underline-offset: 2px; }
.section-body a:hover { text-decoration-color: var(--accent); }

.section-body strong { font-weight: 700; }
.section-body em { font-style: italic; }

.section-body blockquote {
  margin: 16px 0; padding: 12px 20px;
  background: #f5f6f8; border-left: 3px solid var(--text-muted);
  border-radius: 4px; color: var(--text); font-size: 0.95em;
}
.section-body blockquote p:first-child { margin-top: 0; }
.section-body blockquote p:last-child { margin-bottom: 0; }

.section-body img {
  display: block; max-width: 100%; height: auto;
  margin: 20px auto; padding: 12px;
  background: #fff; border: 1px solid var(--border); border-radius: 8px;
}

.section-body table {
  width: 100%; border-collapse: collapse; margin: 16px 0;
  font-size: 0.9em;
}
.section-body th, .section-body td {
  text-align: left; padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.section-body th { background: #f5f6f8; font-weight: 600; }

.section-body code {
  font-family: var(--font-mono); font-size: 0.88em;
  background: #f1f3f5; padding: 1px 6px; border-radius: 3px;
}
.section-body pre {
  background: #f6f8fa; border: 1px solid var(--border);
  border-radius: 8px; padding: 14px 16px;
  overflow-x: auto; font-size: 13px;
  margin: 16px 0;
}
.section-body pre code { background: transparent; padding: 0; }

.section-body details {
  margin: 16px 0; padding: 10px 14px;
  background: #f8f9fb; border: 1px solid var(--border); border-radius: 6px;
}
.section-body details summary {
  cursor: pointer; font-weight: 600; font-size: 13px;
  color: var(--text-muted);
}
.section-body details[open] summary { margin-bottom: 8px; }

.section-body hr { border: 0; border-top: 1px solid var(--border); margin: 28px 0; }

.section-body .katex-display { overflow-x: auto; overflow-y: hidden; padding: 8px 0; }

.lesson-footer {
  text-align: center; padding: 32px;
  color: var(--text-muted); font-size: 14px;
  border-top: 1px solid var(--border); margin-top: 20px;
}
.lesson-footer .muted { font-size: 12px; opacity: 0.7; }
kbd {
  background: var(--surface); border: 1px solid var(--border);
  border-bottom-width: 2px; border-radius: 4px;
  padding: 1px 6px; font-size: 11px; font-family: var(--font-mono);
}

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; padding: 16px; }
  .sidebar { position: static; max-height: none; }
  .toc ol { display: flex; flex-wrap: wrap; gap: 4px; }
  .toc li { flex: 0 0 auto; }
  .toc a { padding: 4px 8px; font-size: 12px; }
  .intro, .lesson-section { padding: 20px; }
  .page-title { font-size: 20px; }
}
`;
}

function getClientScript(): string {
  return `
(function () {
  var sections = document.querySelectorAll(".lesson-section, .intro");
  var tocLinks = document.querySelectorAll(".toc a");
  var progress = document.getElementById("progress");
  var byId = {};
  tocLinks.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    byId[id] = a;
  });

  function update() {
    var scrolled = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = max > 0 ? (scrolled / max * 100) + "%" : "0%";

    var current = null;
    sections.forEach(function (s) {
      var top = s.getBoundingClientRect().top;
      if (top < 140) current = s.id;
    });
    tocLinks.forEach(function (a) { a.classList.remove("active"); });
    if (current && byId[current]) byId[current].classList.add("active");
  }
  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    var ids = Array.prototype.map.call(sections, function (s) { return s.id; });
    var currentIdx = -1;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top < 140) currentIdx = i;
    }
    if (e.key === "ArrowDown" && e.shiftKey) {
      e.preventDefault();
      var next = Math.min(ids.length - 1, currentIdx + 1);
      document.getElementById(ids[next]).scrollIntoView({ behavior: "smooth" });
    }
    if (e.key === "ArrowUp" && e.shiftKey) {
      e.preventDefault();
      var prev = Math.max(0, currentIdx - 1);
      document.getElementById(ids[prev]).scrollIntoView({ behavior: "smooth" });
    }
  });
})();
`;
}

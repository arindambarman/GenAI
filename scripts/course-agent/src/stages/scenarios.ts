import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CONCEPTS } from "../../../capstones/src/scorer/concepts-seed.js";
import {
  SCENARIOS, INDUSTRY_LABELS, INDUSTRY_COLORS, ARCHETYPE_LABELS,
  type Scenario, type Industry,
} from "../scenario-data.js";
import { StageResultSchema, type StageResult } from "../schema.js";

interface ScenariosInput {
  webDir: string;       // e.g. "course/web"
}

export async function runScenariosStage(input: ScenariosInput): Promise<StageResult> {
  const warnings: string[] = [];
  try {
    const outDir = join(input.webDir, "scenarios");
    await mkdir(outDir, { recursive: true });

    const conceptName = new Map<string, string>();
    for (const c of SEED_CONCEPTS) conceptName.set(c.concept_id, c.name);

    const outputs: string[] = [];
    for (const s of SCENARIOS) {
      const path = join(outDir, `${s.id}.html`);
      await writeFile(path, renderScenarioPage(s, conceptName), "utf-8");
      outputs.push(path);
    }

    const indexPath = join(outDir, "index.html");
    await writeFile(indexPath, renderScenarioIndex(SCENARIOS), "utf-8");
    outputs.push(indexPath);

    return StageResultSchema.parse({ stage: "scenarios", ok: true, outputs, warnings });
  } catch (err) {
    return StageResultSchema.parse({
      stage: "scenarios", ok: false, outputs: [], warnings,
      error: err instanceof Error ? err.message : String(err),
    });
  }
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
.container { max-width: 920px; margin: 0 auto; padding: 32px; }
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
  color: var(--text-muted); margin: 32px 0 12px; font-weight: 700; }
.card { background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 20px 24px; margin-bottom: 12px; }
.prose { font-size: 16px; line-height: 1.7; }
.approach ol { padding-left: 22px; margin: 0; }
.approach li { margin-bottom: 10px; font-size: 15px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-block; padding: 4px 10px; border-radius: 6px;
  background: var(--accent-soft); color: var(--accent); font-size: 13px;
  text-decoration: none; border: 1px solid transparent; }
.chip:hover { border-color: var(--accent); }
.industry-pill { display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 700; margin-right: 8px; }
.archetype-pill { display: inline-block; padding: 3px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 600; background: #f3f4f6; color: var(--text-muted);
  margin-right: 8px; }
.complexity { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
  font-weight: 700; color: var(--text-muted); }
.tradeoff { background: #fff8f0; border-left: 3px solid #f59e0b; padding: 12px 16px;
  margin-bottom: 8px; border-radius: 4px; }
.tradeoff .ruled { font-weight: 600; font-size: 14px; }
.tradeoff .reason { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
.success { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 14px 18px;
  border-radius: 6px; font-size: 15px; }
.lesson-link { display: inline-block; margin-right: 6px; padding: 3px 9px;
  background: var(--accent-soft); color: var(--accent); border-radius: 6px;
  font-size: 13px; text-decoration: none; font-variant-numeric: tabular-nums; }
.lesson-link:hover { background: var(--accent); color: #fff; }
.diagram { background: #fafafa; border: 1px solid var(--border); border-radius: 8px;
  padding: 20px; overflow-x: auto; }
.toc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
.toc-card { background: var(--surface); border: 1px solid var(--border); border-left: 4px solid;
  border-radius: 10px; padding: 16px 20px; text-decoration: none; color: inherit;
  transition: border-color 0.15s; display: block; }
.toc-card:hover { border-color: var(--accent); }
.toc-card .title { font-weight: 700; font-size: 16px; margin: 4px 0 6px; }
.toc-card .summary { color: var(--text-muted); font-size: 13px; margin: 0; }
.filter-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 20px; align-items: center; }
.filter-row .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); font-weight: 700; margin-right: 4px; }
.section-divider { color: var(--text-muted); font-size: 12px; text-transform: uppercase;
  letter-spacing: 0.1em; font-weight: 700; margin: 28px 0 10px; }
`;
}

function mermaidScript(): string {
  return `<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'neutral', themeVariables: { fontFamily: 'inherit' } });
</script>`;
}

function industryPillStyle(industry: Industry): string {
  const c = INDUSTRY_COLORS[industry];
  return `background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border};`;
}

function renderScenarioPage(s: Scenario, conceptName: Map<string, string>): string {
  const conceptsHtml = s.conceptsApplied
    .map((id) => {
      const name = conceptName.get(id) ?? id;
      return `<a class="chip" href="../concepts/${id}.html">${escape(name)}</a>`;
    })
    .join("");

  const approachHtml = s.approach.map((step) => `<li>${escape(step)}</li>`).join("\n      ");

  const tradeoffsHtml = s.tradeoffs.map((t) => `<div class="tradeoff">
      <div class="ruled">Ruled out: ${escape(t.ruledOut)}</div>
      <div class="reason">${escape(t.reason)}</div>
    </div>`).join("\n    ");

  const readNextHtml = s.readNext.map((id) => {
    const moduleNum = Number(id.split(".")[0]);
    const slug = `m${String(moduleNum).padStart(2, "0")}`;
    return `<a class="lesson-link" href="../${slug}/lesson-${id}.html">§${id}</a>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(s.title)} · Scenario · AdaptLearn</title>
  <style>${commonStyles()}</style>
  ${mermaidScript()}
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../book.html">Book</a>
      <span class="sep">›</span>
      <a href="index.html">Scenarios</a>
      <span class="sep">›</span>
      <span>${escape(s.title)}</span>
    </nav>

    <header class="hero">
      <h1>${escape(s.title)}</h1>
      <p>${escape(s.persona)} · ${escape(INDUSTRY_LABELS[s.industry])}</p>
      <div class="badges">
        <span class="badge">${escape(ARCHETYPE_LABELS[s.archetype])}</span>
        <span class="badge">${escape(s.complexity)}</span>
      </div>
    </header>

    <h2 class="section">Situation</h2>
    <div class="card prose">${escape(s.situation)}</div>

    <h2 class="section">Problem</h2>
    <div class="card prose">${escape(s.problem)}</div>

    <h2 class="section">Approach</h2>
    <div class="card approach"><ol>
      ${approachHtml}
    </ol></div>

    <h2 class="section">Architecture</h2>
    <div class="diagram">
      <pre class="mermaid">${escape(s.diagram)}</pre>
    </div>

    <h2 class="section">Concepts applied</h2>
    <div class="card"><div class="chips">${conceptsHtml}</div></div>

    <h2 class="section">Trade-offs (what we ruled out)</h2>
    ${tradeoffsHtml}

    <h2 class="section">Eval criteria</h2>
    <div class="success">${escape(s.evalCriteria)}</div>

    <h2 class="section">Rollout plan</h2>
    <div class="card prose">${escape(s.rollout)}</div>

    <h2 class="section">Read next</h2>
    <div class="card">${readNextHtml}</div>
  </div>
</body>
</html>
`;
}

function renderScenarioIndex(scenarios: Scenario[]): string {
  const byIndustry = new Map<Industry, Scenario[]>();
  for (const s of scenarios) {
    if (!byIndustry.has(s.industry)) byIndustry.set(s.industry, []);
    byIndustry.get(s.industry)!.push(s);
  }

  const groupsHtml = Array.from(byIndustry.entries())
    .map(([industry, items]) => {
      const c = INDUSTRY_COLORS[industry];
      const cards = items.map((s) => `        <a class="toc-card" href="${s.id}.html" style="border-left-color: ${c.border};">
          <span class="industry-pill" style="${industryPillStyle(industry)}">${escape(INDUSTRY_LABELS[industry])}</span>
          <span class="archetype-pill">${escape(ARCHETYPE_LABELS[s.archetype])}</span>
          <span class="complexity">${escape(s.complexity)}</span>
          <div class="title">${escape(s.title)}</div>
          <p class="summary">${escape(s.problem.slice(0, 160))}${s.problem.length > 160 ? "…" : ""}</p>
        </a>`).join("\n");
      return `    <div class="section-divider">${escape(INDUSTRY_LABELS[industry])} · ${items.length} scenario${items.length === 1 ? "" : "s"}</div>
    <div class="toc-grid">
${cards}
    </div>`;
    }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scenario Knowledge Base · AdaptLearn</title>
  <style>${commonStyles()}</style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../book.html">Book</a>
      <span class="sep">›</span>
      <span>Scenarios</span>
    </nav>
    <header class="hero">
      <h1>Scenario Knowledge Base</h1>
      <p>Real-world problems and how to architect agent solutions for them. Each scenario cross-links to the concepts and lessons it uses.</p>
      <p class="meta">${scenarios.length} scenarios · ${new Set(scenarios.map((s) => s.industry)).size} industries · ${new Set(scenarios.map((s) => s.archetype)).size} archetypes</p>
    </header>

${groupsHtml}

    <h2 class="section">How to add more</h2>
    <div class="card prose">
      <p>Edit <code>scripts/course-agent/src/scenario-data.ts</code> and run <code>npx tsx scripts/course-agent/src/index.ts scenarios</code> to regenerate. The brainstorm-agent capstone can draft new scenarios from a topic list — see the README.</p>
    </div>
  </div>
</body>
</html>
`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

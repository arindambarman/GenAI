import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CONCEPTS } from "../../../capstones/src/scorer/concepts-seed.js";
import {
  EVAL_RECIPES, SUB_AREA_LABELS, SUB_AREA_COLORS,
  type EvalRecipe, type SubArea,
} from "../eval-recipe-data.js";
import { StageResultSchema, type StageResult } from "../schema.js";

interface EvalRecipesInput {
  webDir: string;
}

export async function runEvalRecipesStage(input: EvalRecipesInput): Promise<StageResult> {
  const warnings: string[] = [];
  try {
    const outDir = join(input.webDir, "eval-recipes");
    await mkdir(outDir, { recursive: true });

    const conceptName = new Map<string, string>();
    for (const c of SEED_CONCEPTS) conceptName.set(c.concept_id, c.name);
    const recipeTitle = new Map<string, string>();
    for (const r of EVAL_RECIPES) recipeTitle.set(r.id, r.title);

    const outputs: string[] = [];
    for (const r of EVAL_RECIPES) {
      const path = join(outDir, `${r.id}.html`);
      await writeFile(path, renderRecipePage(r, conceptName, recipeTitle), "utf-8");
      outputs.push(path);
    }

    const indexPath = join(outDir, "index.html");
    await writeFile(indexPath, renderRecipeIndex(EVAL_RECIPES), "utf-8");
    outputs.push(indexPath);

    return StageResultSchema.parse({ stage: "eval-recipes", ok: true, outputs, warnings });
  } catch (err) {
    return StageResultSchema.parse({
      stage: "eval-recipes", ok: false, outputs: [], warnings,
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
  --code-bg: #1e293b; --code-fg: #e2e8f0;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  font-size: 17px; line-height: 1.65; color: var(--text); background: var(--bg); }
.container { max-width: 920px; margin: 0 auto; padding: 32px; }
.breadcrumb { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.breadcrumb a { color: var(--text-muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent); text-decoration: underline; }
.breadcrumb .sep { margin: 0 6px; opacity: 0.5; }
.hero { padding: 32px; background: linear-gradient(135deg, #1c2230 0%, #2d3a55 100%);
  color: #fff; border-radius: 14px; margin-bottom: 28px; }
.hero h1 { margin: 0 0 8px; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
.hero p { margin: 0; opacity: 0.85; font-size: 16px; }
.badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
  padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
h2.section { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-muted); margin: 28px 0 10px; font-weight: 700; }
.card { background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 18px 22px; margin-bottom: 12px; }
.prose { font-size: 16px; line-height: 1.7; }
.callout { background: var(--accent-soft); border-left: 3px solid var(--accent);
  padding: 12px 16px; border-radius: 4px; font-size: 15px; margin-bottom: 12px; }
.callout strong { color: var(--accent); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-block; padding: 4px 10px; border-radius: 6px;
  background: var(--accent-soft); color: var(--accent); font-size: 13px;
  text-decoration: none; border: 1px solid transparent; }
.chip:hover { border-color: var(--accent); }
.subarea-pill { display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 700; margin-right: 8px; }
.complexity { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
  font-weight: 700; color: var(--text-muted); }
.steps ol { padding-left: 22px; margin: 0; }
.steps li { margin-bottom: 8px; font-size: 15px; }
.pitfall { background: #fff8f0; border-left: 3px solid #f59e0b; padding: 12px 16px;
  margin-bottom: 8px; border-radius: 4px; }
.pitfall .trap { font-weight: 600; font-size: 14px; }
.pitfall .fix { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
.pitfall .fix strong { color: #16a34a; }
.success { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 14px 18px;
  border-radius: 6px; font-size: 15px; }
.lesson-link { display: inline-block; margin-right: 6px; padding: 3px 9px;
  background: var(--accent-soft); color: var(--accent); border-radius: 6px;
  font-size: 13px; text-decoration: none; font-variant-numeric: tabular-nums; }
.lesson-link:hover { background: var(--accent); color: #fff; }
.diagram { background: #fafafa; border: 1px solid var(--border); border-radius: 8px;
  padding: 20px; overflow-x: auto; margin-bottom: 12px; }
pre.code { background: var(--code-bg); color: var(--code-fg); padding: 16px 20px;
  border-radius: 8px; overflow-x: auto; font-family: "SF Mono", Monaco, Consolas, monospace;
  font-size: 13px; line-height: 1.55; margin: 0; }
pre.code .lang { display: block; font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 8px; }
.toc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
.toc-card { background: var(--surface); border: 1px solid var(--border); border-left: 4px solid;
  border-radius: 10px; padding: 16px 20px; text-decoration: none; color: inherit;
  transition: border-color 0.15s; display: block; }
.toc-card:hover { border-color: var(--accent); }
.toc-card .title { font-weight: 700; font-size: 16px; margin: 6px 0; }
.toc-card .summary { color: var(--text-muted); font-size: 13px; margin: 0; }
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

function subAreaPillStyle(subArea: SubArea): string {
  const c = SUB_AREA_COLORS[subArea];
  return `background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border};`;
}

function renderRecipePage(
  r: EvalRecipe,
  conceptName: Map<string, string>,
  recipeTitle: Map<string, string>,
): string {
  const conceptsHtml = r.conceptsApplied.map((id) => {
    const name = conceptName.get(id) ?? id;
    return `<a class="chip" href="../concepts/${id}.html">${escape(name)}</a>`;
  }).join("");

  const relatedHtml = r.relatedRecipes
    .filter((id) => recipeTitle.has(id))
    .map((id) => `<a class="chip" href="${id}.html">${escape(recipeTitle.get(id)!)}</a>`)
    .join("");

  const setupHtml = r.setup.map((s) => `<li>${escape(s)}</li>`).join("\n      ");

  const pitfallsHtml = r.pitfalls.map((p) => `<div class="pitfall">
      <div class="trap">⚠️ ${escape(p.trap)}</div>
      <div class="fix"><strong>Fix:</strong> ${escape(p.fix)}</div>
    </div>`).join("\n    ");

  const readNextHtml = r.readNext.map((id) => {
    const moduleNum = Number(id.split(".")[0]);
    const slug = `m${String(moduleNum).padStart(2, "0")}`;
    return `<a class="lesson-link" href="../${slug}/lesson-${id}.html">§${id}</a>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(r.title)} · Eval Recipe · AdaptLearn</title>
  <style>${commonStyles()}</style>
  ${mermaidScript()}
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../book.html">Book</a>
      <span class="sep">›</span>
      <a href="index.html">Eval Recipes</a>
      <span class="sep">›</span>
      <span>${escape(r.title)}</span>
    </nav>

    <header class="hero">
      <h1>${escape(r.title)}</h1>
      <p>${escape(SUB_AREA_LABELS[r.subArea])}</p>
      <div class="badges">
        <span class="badge">${escape(r.subArea)}</span>
        <span class="badge">${escape(r.complexity)}</span>
      </div>
    </header>

    <div class="callout"><strong>When to use:</strong> ${escape(r.whenToUse)}</div>
    <div class="callout"><strong>What it measures:</strong> ${escape(r.whatItMeasures)}</div>

    <h2 class="section">Setup</h2>
    <div class="card steps"><ol>
      ${setupHtml}
    </ol></div>

    <h2 class="section">Code template</h2>
    <pre class="code"><span class="lang">${escape(r.codeSnippet.language)}</span>${escape(r.codeSnippet.code)}</pre>

    <h2 class="section">Flow</h2>
    <div class="diagram">
      <pre class="mermaid">${escape(r.diagram)}</pre>
    </div>

    <h2 class="section">Acceptance threshold</h2>
    <div class="success">${escape(r.acceptanceThreshold)}</div>

    <h2 class="section">Pitfalls</h2>
    ${pitfallsHtml}

    <h2 class="section">Concepts applied</h2>
    <div class="card"><div class="chips">${conceptsHtml}</div></div>

    ${relatedHtml ? `<h2 class="section">Related recipes</h2>
    <div class="card"><div class="chips">${relatedHtml}</div></div>` : ""}

    <h2 class="section">Read next</h2>
    <div class="card">${readNextHtml}</div>
  </div>
</body>
</html>
`;
}

function renderRecipeIndex(recipes: EvalRecipe[]): string {
  const bySubArea = new Map<SubArea, EvalRecipe[]>();
  for (const r of recipes) {
    if (!bySubArea.has(r.subArea)) bySubArea.set(r.subArea, []);
    bySubArea.get(r.subArea)!.push(r);
  }

  const orderedAreas: SubArea[] = ["correctness", "behavior", "cost-latency", "safety", "ops"];

  const groupsHtml = orderedAreas
    .filter((sa) => bySubArea.has(sa))
    .map((subArea) => {
      const items = bySubArea.get(subArea)!;
      const c = SUB_AREA_COLORS[subArea];
      const cards = items.map((r) => `        <a class="toc-card" href="${r.id}.html" style="border-left-color: ${c.border};">
          <span class="subarea-pill" style="${subAreaPillStyle(subArea)}">${escape(SUB_AREA_LABELS[subArea])}</span>
          <span class="complexity">${escape(r.complexity)}</span>
          <div class="title">${escape(r.title)}</div>
          <p class="summary">${escape(r.whatItMeasures.slice(0, 160))}${r.whatItMeasures.length > 160 ? "…" : ""}</p>
        </a>`).join("\n");
      return `    <div class="section-divider">${escape(SUB_AREA_LABELS[subArea])} · ${items.length} recipe${items.length === 1 ? "" : "s"}</div>
    <div class="toc-grid">
${cards}
    </div>`;
    }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Eval &amp; Observability Recipes · AdaptLearn</title>
  <style>${commonStyles()}</style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../book.html">Book</a>
      <span class="sep">›</span>
      <span>Eval Recipes</span>
    </nav>
    <header class="hero">
      <h1>Eval &amp; Observability Recipes</h1>
      <p>Actionable patterns for measuring agent quality, behavior, cost, safety, and ops health. Each recipe has setup steps, runnable code, acceptance thresholds, and known pitfalls.</p>
      <p class="badges"><span class="badge">${recipes.length} recipes</span> <span class="badge">${orderedAreas.filter((sa) => bySubArea.has(sa)).length} categories</span></p>
    </header>

${groupsHtml}

    <h2 class="section">How to add more</h2>
    <div class="card prose">
      <p>Edit <code>scripts/course-agent/src/eval-recipe-data.ts</code> and run <code>npx tsx scripts/course-agent/src/index.ts eval-recipes</code> to regenerate.</p>
    </div>
  </div>
</body>
</html>
`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

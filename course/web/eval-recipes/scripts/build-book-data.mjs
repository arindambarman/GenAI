// Build window.BOOK from the existing book HTML (modules, lessons, concepts + edges).
// Run:  node eval-recipes/scripts/build-book-data.mjs   (cwd = course/web)
// Output: course/web/book-data.js
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..", "..");            // course/web
const out = join(WEB, "book-data.js");

const read = (p) => readFileSync(p, "utf8");
const strip = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, " ").trim();
const titleSeg = (html) => {
  const m = /<title>([^<]*)<\/title>/.exec(html);
  return m ? m[1] : "";
};
const padMod = (n) => "m" + String(n).padStart(2, "0");

// ── modules ────────────────────────────────────────────────────────────────
const modules = {};
for (let n = 1; n <= 14; n++) {
  const id = padMod(n);
  const idx = join(WEB, id, "index.html");
  if (!existsSync(idx)) continue;
  const html = read(idx);
  // <title>Module 5 · Memory & Retrieval (RAG for Agents) · AdaptLearn</title>
  const t = titleSeg(html).split("·").map((s) => s.trim());
  const title = strip(t.length >= 2 ? t[1] : (t[0] || id));
  // lessons: pair href + lesson-title in document order
  const lessons = [];
  const re = /href="(lesson-(\d+\.\d+)\.html)"[\s\S]*?lesson-title"[^>]*>([^<]*)/g;
  let m;
  while ((m = re.exec(html))) lessons.push({ num: m[2], title: strip(m[3]) });
  // fallback: just hrefs if the paired regex missed
  if (!lessons.length) {
    const re2 = /href="lesson-(\d+\.\d+)\.html"/g;
    const seen = {};
    while ((m = re2.exec(html))) { if (!seen[m[1]]) { seen[m[1]] = 1; lessons.push({ num: m[1], title: "" }); } }
  }
  const pm = /Prereqs:\*\*?\s*([^<*]+)/.exec(html) || /Prereqs:\s*([^<*]+)/.exec(html);
  modules[id] = { id, num: n, title, prereqs: pm ? strip(pm[1]) : "", lessons: lessons.map((l) => l.num) };
  // stash lesson titles for the lessons pass
  modules[id]._lessonTitles = Object.fromEntries(lessons.map((l) => [l.num, l.title]));
}

// ── lessons ──────────────────────────────────────────────────────────────────
const lessons = {};
for (const id of Object.keys(modules)) {
  const dir = join(WEB, id);
  for (const f of readdirSync(dir)) {
    const lm = /^lesson-(\d+\.\d+)\.html$/.exec(f);
    if (!lm) continue;
    const num = lm[1];
    const html = read(join(dir, f));
    let title = "";
    const pt = /class="page-title"[^>]*>([^<]*)/.exec(html);
    if (pt) title = strip(pt[1]);
    if (!title) {
      const t = titleSeg(html).split("·").map((s) => s.trim());
      title = strip(t.length >= 2 ? t[1] : t[0]);
    }
    if (!title) title = (modules[id]._lessonTitles || {})[num] || ("Lesson " + num);
    lessons[num] = { id: num, module: id, title, href: `${id}/lesson-${f.split("lesson-")[1]}`, concepts: [] };
  }
}
for (const id of Object.keys(modules)) delete modules[id]._lessonTitles;

// ── concepts ──────────────────────────────────────────────────────────────────
const concepts = {};
const cdir = join(WEB, "concepts");
const chipsIn = (block) => {
  const ids = [];
  const re = /href="([a-z0-9-]+)\.html"/g;
  let m;
  while ((m = re.exec(block))) { if (m[1] !== "index") ids.push(m[1]); }
  return [...new Set(ids)];
};
// pull the chips block that follows a given <h2 class="section">LABEL</h2>
const sectionBlock = (html, label) => {
  const i = html.indexOf(`>${label}<`);
  if (i < 0) return "";
  const rest = html.slice(i);
  const next = rest.indexOf('<h2 class="section"', 3);
  return next < 0 ? rest : rest.slice(0, next);
};

for (const f of readdirSync(cdir)) {
  if (!f.endsWith(".html") || f === "index.html") continue;
  const cid = f.replace(/\.html$/, "");
  const html = read(join(cdir, f));
  const tseg = titleSeg(html).split("·")[0];
  let title = strip(tseg);
  const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(html);
  if (h1 && strip(h1[1])) title = strip(h1[1]);
  // badges: [M#, category, importance N/10]
  const badges = [...html.matchAll(/<span class="badge">([^<]*)<\/span>/g)].map((m) => strip(m[1]));
  let module = "", category = "", importance = null;
  for (const b of badges) {
    const mm = /^M(\d+)$/.exec(b);
    const im = /importance\s+(\d+)\s*\/\s*10/.exec(b);
    if (mm) module = padMod(+mm[1]);
    else if (im) importance = +im[1];
    else if (!category) category = b;
  }
  const dm = /<div class="def">([\s\S]*?)<\/div>/.exec(html);
  const def = dm ? strip(dm[1]) : "";
  // covering lessons: ../mNN/lesson-X.Y.html
  const lessonsCov = [...new Set([...html.matchAll(/lesson-(\d+\.\d+)\.html/g)].map((m) => m[1]))];
  const prereqs = chipsIn(sectionBlock(html, "Prerequisites")).filter((x) => x !== cid);
  const related = chipsIn(sectionBlock(html, "Related concepts")).filter((x) => x !== cid);
  const usedby = chipsIn(sectionBlock(html, "Used by")).filter((x) => x !== cid);
  concepts[cid] = {
    id: cid, title, module, category, importance, def,
    lessons: lessonsCov, prereqs, related, usedby,
    href: `concepts/${f}`,
  };
  // back-fill lesson -> concept
  for (const ln of lessonsCov) if (lessons[ln] && !lessons[ln].concepts.includes(cid)) lessons[ln].concepts.push(cid);
}

// drop concept edge targets that don't resolve to a real concept
const valid = new Set(Object.keys(concepts));
for (const c of Object.values(concepts)) {
  for (const k of ["prereqs", "related", "usedby"]) c[k] = c[k].filter((x) => valid.has(x));
}

// distinct categories (for graph coloring)
const categories = [...new Set(Object.values(concepts).map((c) => c.category).filter(Boolean))].sort();

const BOOK = {
  meta: {
    modules: Object.keys(modules).length,
    lessons: Object.keys(lessons).length,
    concepts: Object.keys(concepts).length,
    categories,
    generated: new Date().toISOString().slice(0, 10),
  },
  modules, lessons, concepts,
};

const banner = `/**
 * book-data.js — single source of truth for the Agentic Systems book experience.
 * GENERATED by eval-recipes/scripts/build-book-data.mjs from the existing HTML.
 * window.BOOK = { meta, modules{}, lessons{}, concepts{} }
 *   concept edges: prereqs[] · related[] · usedby[] (concept ids) · lessons[] (lesson nums)
 *   lesson.concepts[] back-links · lesson.module · concept.module/category/importance
 * Re-run the builder after editing book content; do not hand-edit this file.
 */
window.BOOK = `;
writeFileSync(out, banner + JSON.stringify(BOOK, null, 2) + ";\n");

// console summary
const edgeCount = Object.values(concepts).reduce((s, c) => s + c.prereqs.length + c.related.length + c.usedby.length, 0);
console.log(`book-data.js written: ${BOOK.meta.modules} modules, ${BOOK.meta.lessons} lessons, ${BOOK.meta.concepts} concepts`);
console.log(`categories: ${categories.join(", ")}`);
console.log(`concept edges: ${edgeCount}; concepts with no module: ${Object.values(concepts).filter((c) => !c.module).length}`);
console.log(`lessons with concepts: ${Object.values(lessons).filter((l) => l.concepts.length).length}/${BOOK.meta.lessons}`);

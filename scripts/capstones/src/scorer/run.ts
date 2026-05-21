#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ProgressSchema, type Progress, type ConceptScore } from "./schema.js";
import {
  computeAll,
  moduleAggregates,
  overallScore,
  recommendReview,
  categoryAggregates,
} from "./score.js";
import { SEED_CONCEPTS } from "./concepts-seed.js";

const DEFAULT_PROGRESS_PATH = resolve("learner-progress/progress.json");

const HELP = `scorer — track per-concept learning progress with spaced repetition

Usage:
  scorer init                                    initialise progress.json with 53 concepts
  scorer rate <id> --depth N --confidence N      update a concept's scores
                  [--note "..."] [--source self|quiz|judge|artifact]
  scorer review [--limit N]                      what should I review next?
  scorer report                                  full progress report
  scorer status <id>                             one-concept status
  scorer list [--module Mn] [--status weak|wobbly|mastered|unstarted]

Examples:
  pnpm --filter @adaptlearn/capstones scorer init
  pnpm --filter @adaptlearn/capstones scorer rate agency-dial --depth 4 --confidence 4
  pnpm --filter @adaptlearn/capstones scorer review
  pnpm --filter @adaptlearn/capstones scorer report > report.md
  pnpm --filter @adaptlearn/capstones scorer list --status weak

Bloom depth scale (0-5):
  0 = unstarted          1 = recall ("what is it?")
  2 = understand         3 = apply (use in new scenario)
  4 = analyse/evaluate   5 = create (design with it)

Storage: ${DEFAULT_PROGRESS_PATH}
`;

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [, , command = "help", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

async function loadProgress(path: string = DEFAULT_PROGRESS_PATH): Promise<Progress> {
  if (!existsSync(path)) {
    throw new Error(
      `No progress file at ${path}. Run \`scorer init\` first to create one.`,
    );
  }
  const raw = await readFile(path, "utf-8");
  return ProgressSchema.parse(JSON.parse(raw));
}

async function saveProgress(p: Progress, path: string = DEFAULT_PROGRESS_PATH): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  p.last_session = new Date().toISOString();
  await writeFile(path, JSON.stringify(p, null, 2), "utf-8");
}

function findConcept(p: Progress, id: string): ConceptScore | undefined {
  return p.concepts.find((c) => c.concept_id === id);
}

function statusColor(status: string): string {
  switch (status) {
    case "mastered": return "🟢";
    case "wobbly":   return "🟡";
    case "weak":     return "🔴";
    case "unstarted":return "⚪";
    default: return "  ";
  }
}

// ─── Commands ───────────────────────────────────────────────────────

async function cmdInit(force: boolean, path: string): Promise<void> {
  if (existsSync(path) && !force) {
    console.error(`Progress file already exists at ${path}.`);
    console.error("Use --force to overwrite (you'll lose existing progress).");
    process.exit(1);
  }
  const progress: Progress = {
    learner_id: "default",
    started_at: new Date().toISOString(),
    last_session: null,
    concepts: SEED_CONCEPTS.map((c) => ({ ...c, review_history: [], evidence: [] })),
  };
  await saveProgress(progress, path);
  console.log(`✓ Initialised ${path} with ${progress.concepts.length} concepts.`);
  console.log(`  All concepts start at depth=0, confidence=0 (status: unstarted).`);
  console.log(`  Rate a concept: scorer rate <id> --depth N --confidence N`);
}

async function cmdRate(id: string, flags: Record<string, string>, path: string): Promise<void> {
  const depth = Number(flags.depth);
  const confidence = Number(flags.confidence);
  if (!Number.isInteger(depth) || depth < 0 || depth > 5) {
    console.error("--depth must be an integer 0-5");
    process.exit(1);
  }
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 5) {
    console.error("--confidence must be an integer 0-5");
    process.exit(1);
  }

  const p = await loadProgress(path);
  const c = findConcept(p, id);
  if (!c) {
    console.error(`Concept not found: ${id}`);
    console.error(`Did you mean one of:`);
    const fuzz = p.concepts.filter((x) => x.concept_id.includes(id) || x.name.toLowerCase().includes(id.toLowerCase())).slice(0, 5);
    for (const m of fuzz) console.error(`  ${m.concept_id} — ${m.name}`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const source = (flags.source ?? "self") as "self" | "quiz" | "judge" | "artifact";

  c.review_history.push({ date: now, depth, confidence, source });
  c.depth = depth;
  c.confidence = confidence;
  c.last_reviewed = now;
  c.evidence.push({
    type: source,
    ref: flags.ref ?? `${source}-rating`,
    score: depth,
    date: now,
    ...(flags.note && { note: flags.note }),
  });
  if (flags.note) c.notes = flags.note;

  await saveProgress(p, path);

  const [computed] = computeAll({ ...p, concepts: [c] });
  console.log(`✓ ${c.name}`);
  console.log(`  depth=${depth}  confidence=${confidence}  status=${statusColor(computed.status)} ${computed.status}`);
  console.log(`  peak=${computed.peak_score}  decayed=${computed.decayed_score}  half-life=${computed.half_life_days}d`);
}

async function cmdReview(flags: Record<string, string>, path: string): Promise<void> {
  const limit = flags.limit ? Number(flags.limit) : 5;
  const p = await loadProgress(path);
  const computed = computeAll(p);
  const recs = recommendReview(computed, { limit });

  if (recs.length === 0) {
    console.log("🎉 Nothing urgent to review. Pick anything you're curious about!");
    return;
  }

  console.log(`📚 Top ${recs.length} concepts to review next:\n`);
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    const c = r.concept;
    console.log(`${i + 1}. ${statusColor(c.status)} ${c.name}  [${c.module}, importance ${c.importance}]`);
    console.log(`     id: ${c.concept_id}`);
    console.log(`     reason: ${r.reason} · depth=${c.depth} · decayed=${c.decayed_score} · days-since=${c.days_since_review ?? "never"}`);
    console.log();
  }

  console.log("After studying, update with:");
  console.log(`  scorer rate ${recs[0].concept.concept_id} --depth N --confidence N`);
}

async function cmdReport(path: string): Promise<void> {
  const p = await loadProgress(path);
  const computed = computeAll(p);
  const modules = moduleAggregates(computed);
  const overall = overallScore(modules);
  const cats = categoryAggregates(computed);
  const recs = recommendReview(computed, { limit: 5 });

  const lines: string[] = [];
  lines.push(`# Learning Progress Report`);
  lines.push("");
  lines.push(`**Learner:** ${p.learner_id}  ·  **Started:** ${p.started_at.slice(0, 10)}  ·  **Last session:** ${p.last_session?.slice(0, 10) ?? "never"}`);
  lines.push("");

  // Overall
  lines.push(`## Overall`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Weighted score (0-5) | **${overall.weighted}** |`);
  lines.push(`| Raw average (0-5) | ${overall.raw} |`);
  lines.push(`| Mastered | ${overall.mastered_pct}% (${modules.reduce((a, m) => a + m.mastered, 0)}/${overall.total_concepts}) |`);
  lines.push(`| Concepts tracked | ${overall.total_concepts} |`);
  lines.push("");

  // Per module
  lines.push(`## Per module`);
  lines.push("");
  lines.push(`| Module | Score | Mastered | Wobbly | Weak | Unstarted |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const m of modules) {
    lines.push(`| ${m.module} | **${m.weighted_score}** | 🟢 ${m.mastered} | 🟡 ${m.wobbly} | 🔴 ${m.weak} | ⚪ ${m.unstarted} |`);
  }
  lines.push("");

  // Per category
  lines.push(`## Per category`);
  lines.push("");
  lines.push(`| Category | Score | Mastered |`);
  lines.push(`|---|---|---|`);
  for (const c of cats) {
    lines.push(`| ${c.category} | **${c.weighted_score}** | ${c.mastered} / ${c.count} |`);
  }
  lines.push("");

  // Review recommendations
  if (recs.length > 0) {
    lines.push(`## Suggested next study session`);
    lines.push("");
    for (let i = 0; i < recs.length; i++) {
      const c = recs[i].concept;
      lines.push(`${i + 1}. ${statusColor(c.status)} **${c.name}** \`${c.concept_id}\` — depth ${c.depth}, decayed ${c.decayed_score}`);
    }
    lines.push("");
  }

  // Recently reviewed
  const recent = computed
    .filter((c) => c.days_since_review !== null && c.days_since_review <= 7)
    .sort((a, b) => (a.days_since_review ?? 999) - (b.days_since_review ?? 999))
    .slice(0, 10);
  if (recent.length > 0) {
    lines.push(`## Recently reviewed (last 7 days)`);
    lines.push("");
    for (const c of recent) {
      lines.push(`- ${statusColor(c.status)} **${c.name}** — ${c.days_since_review}d ago, depth=${c.depth}, score=${c.decayed_score}`);
    }
    lines.push("");
  }

  console.log(lines.join("\n"));
}

async function cmdStatus(id: string, path: string): Promise<void> {
  const p = await loadProgress(path);
  const c = findConcept(p, id);
  if (!c) {
    console.error(`Not found: ${id}`);
    process.exit(1);
  }
  const [computed] = computeAll({ ...p, concepts: [c] });
  console.log(`${statusColor(computed.status)} ${computed.name}  [${computed.module}, ${computed.category}, importance ${computed.importance}]`);
  console.log(`Status:       ${computed.status}`);
  console.log(`Depth:        ${computed.depth} / 5`);
  console.log(`Confidence:   ${computed.confidence} / 5`);
  console.log(`Peak score:   ${computed.peak_score}`);
  console.log(`Decayed:      ${computed.decayed_score}`);
  console.log(`Half-life:    ${computed.half_life_days}d`);
  console.log(`Last review:  ${computed.last_reviewed ?? "never"} (${computed.days_since_review ?? "—"}d ago)`);
  console.log(`Evidence:     ${computed.evidence.length} entries`);
  console.log(`Reviews:      ${computed.review_history.length} entries`);
  if (computed.notes) console.log(`Notes:        ${computed.notes}`);
}

async function cmdList(flags: Record<string, string>, path: string): Promise<void> {
  const p = await loadProgress(path);
  let computed = computeAll(p);
  if (flags.module) computed = computed.filter((c) => c.module === flags.module);
  if (flags.status) computed = computed.filter((c) => c.status === flags.status);
  if (flags.category) computed = computed.filter((c) => c.category === flags.category);

  // Sort by module then importance
  computed.sort((a, b) => {
    const na = Number(a.module.replace("M", ""));
    const nb = Number(b.module.replace("M", ""));
    if (na !== nb) return na - nb;
    return b.importance - a.importance;
  });

  for (const c of computed) {
    console.log(`${statusColor(c.status)} [${c.module}] ${c.concept_id.padEnd(28)} score=${c.decayed_score.toFixed(2).padStart(5)}  importance=${c.importance.toString().padStart(2)}  ${c.name}`);
  }
  console.log(`\n${computed.length} concepts shown.`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const { command, positional, flags } = parseArgs(process.argv);
  const path = flags.path ?? DEFAULT_PROGRESS_PATH;

  switch (command) {
    case "init":
      await cmdInit(flags.force === "true", path);
      return 0;
    case "rate":
      if (!positional[0]) { console.error("Usage: scorer rate <id> --depth N --confidence N"); return 2; }
      await cmdRate(positional[0], flags, path);
      return 0;
    case "review":
      await cmdReview(flags, path);
      return 0;
    case "report":
      await cmdReport(path);
      return 0;
    case "status":
      if (!positional[0]) { console.error("Usage: scorer status <id>"); return 2; }
      await cmdStatus(positional[0], path);
      return 0;
    case "list":
      await cmdList(flags, path);
      return 0;
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return 0;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      return 2;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    if (err instanceof Error) {
      console.error("Fatal:", err.message);
      if (err.stack) console.error(err.stack);
    } else {
      console.error("Fatal:", String(err));
    }
    process.exit(1);
  });

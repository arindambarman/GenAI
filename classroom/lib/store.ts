import { getDb } from "./db";
import { PERSONAS } from "./personas";
import { schedule, SrsState } from "./srs";
import { ModuleInfo, reviewValue, SkillEvent, teachbackValue } from "./skills";
import { Bundle, CardStats, Diff, DueCard, Message, NewCard, Roadmap, RoadmapSummary, Teachback } from "./types";

type Row = Record<string, unknown>;
const now = () => Date.now();

export function saveRoadmap(r: Roadmap): void {
  getDb()
    .prepare(
      `insert into roadmaps (id, goal, level, summary, json, created_at) values (?,?,?,?,?,?)
       on conflict(id) do update set goal=excluded.goal, level=excluded.level, summary=excluded.summary, json=excluded.json`,
    )
    .run(r.id, r.goal, r.level, r.summary, JSON.stringify(r), now());
}

export function listRoadmaps(): RoadmapSummary[] {
  const rows = getDb()
    .prepare(
      `select r.id, r.goal, r.level, r.created_at as createdAt, r.json,
        (select count(*) from progress p where p.roadmap_id = r.id) as done,
        (select count(*) from messages m where m.roadmap_id = r.id) as messages
       from roadmaps r order by r.created_at desc`,
    )
    .all() as Row[];
  return rows.map((r) => ({
    id: String(r.id),
    goal: String(r.goal),
    level: String(r.level),
    createdAt: Number(r.createdAt),
    modules: (JSON.parse(String(r.json)) as Roadmap).modules.length,
    done: Number(r.done),
    messages: Number(r.messages),
  }));
}

export function getBundle(id: string): Bundle | null {
  const db = getDb();
  const row = db.prepare("select json from roadmaps where id = ?").get(id) as Row | undefined;
  if (!row) return null;
  const done = (db.prepare("select module_id from progress where roadmap_id = ?").all(id) as Row[]).map((r) => String(r.module_id));
  const chats: Bundle["chats"] = {};
  for (const m of db.prepare("select module_id, speaker, text from messages where roadmap_id = ? order by id").all(id) as Row[]) {
    (chats[String(m.module_id)] ??= []).push({ speaker: String(m.speaker), text: String(m.text) });
  }
  const artifacts: Bundle["artifacts"] = {};
  for (const a of db.prepare("select module_id, kind, text from artifacts where roadmap_id = ?").all(id) as Row[]) {
    (artifacts[String(a.module_id)] ??= {})[String(a.kind)] = String(a.text);
  }
  const teachbacks: Bundle["teachbacks"] = {};
  for (const t of db.prepare("select * from teachbacks where roadmap_id = ? order by id").all(id) as Row[]) {
    (teachbacks[String(t.module_id)] ??= []).push({
      id: Number(t.id),
      text: String(t.text),
      score: Number(t.score),
      concepts: JSON.parse(String(t.concepts)),
      strengths: String(t.strengths),
      gaps: JSON.parse(String(t.gaps)),
      critiques: JSON.parse(String(t.critiques)),
      createdAt: Number(t.created_at),
    });
  }
  const cardCounts: Bundle["cardCounts"] = {};
  for (const c of db.prepare("select module_id, count(*) as n from cards where roadmap_id = ? group by module_id").all(id) as Row[]) {
    cardCounts[String(c.module_id)] = Number(c.n);
  }
  return { roadmap: JSON.parse(String(row.json)) as Roadmap, done, chats, artifacts, teachbacks, cardCounts };
}

export function addMessages(roadmapId: string, moduleId: string, msgs: Message[]): void {
  const db = getDb();
  const ins = db.prepare("insert into messages (roadmap_id, module_id, speaker, text, created_at) values (?,?,?,?,?)");
  db.exec("begin");
  try {
    for (const m of msgs) ins.run(roadmapId, moduleId, m.speaker, m.text, now());
    db.exec("commit");
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
}

export function setArtifact(roadmapId: string, moduleId: string, kind: string, text: string): void {
  getDb()
    .prepare(
      `insert into artifacts (roadmap_id, module_id, kind, text, updated_at) values (?,?,?,?,?)
       on conflict(roadmap_id, module_id, kind) do update set text=excluded.text, updated_at=excluded.updated_at`,
    )
    .run(roadmapId, moduleId, kind, text, now());
}

export function addTeachback(roadmapId: string, moduleId: string, t: Teachback): void {
  getDb()
    .prepare(
      "insert into teachbacks (roadmap_id, module_id, text, score, concepts, strengths, gaps, critiques, created_at) values (?,?,?,?,?,?,?,?,?)",
    )
    .run(roadmapId, moduleId, t.text, t.score, JSON.stringify(t.concepts), t.strengths, JSON.stringify(t.gaps), JSON.stringify(t.critiques), now());
}

export function addCards(roadmapId: string, moduleId: string, cards: NewCard[]): void {
  const db = getDb();
  const ins = db.prepare("insert into cards (roadmap_id, module_id, concept, q, a, due, created_at) values (?,?,?,?,?,?,?)");
  db.exec("begin");
  try {
    for (const c of cards) ins.run(roadmapId, moduleId, c.concept, c.q, c.a, now(), now()); // new cards are due immediately
    db.exec("commit");
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
}

function toDueCard(r: Row): DueCard {
  const road = JSON.parse(String(r.json)) as Roadmap;
  return {
    id: Number(r.id),
    roadmapId: String(r.roadmap_id),
    moduleId: String(r.module_id),
    moduleTitle: road.modules.find((m) => m.id === r.module_id)?.title ?? "",
    goal: road.goal,
    concept: String(r.concept),
    q: String(r.q),
    a: String(r.a),
    reps: Number(r.reps),
    interval: Number(r.interval),
    ease: Number(r.ease),
    lapses: Number(r.lapses),
    due: Number(r.due),
  };
}

/** Cards due now, most overdue first. */
export function dueCards(at = now(), limit = 50): DueCard[] {
  const rows = getDb()
    .prepare("select c.*, r.json from cards c join roadmaps r on r.id = c.roadmap_id where c.due <= ? order by c.due limit ?")
    .all(at, limit) as Row[];
  return rows.map(toDueCard);
}

export function cardStats(at = now()): CardStats {
  const r = getDb().prepare("select count(*) as total, coalesce(sum(due <= ?), 0) as due from cards").get(at) as Row;
  return { due: Number(r.due), total: Number(r.total) };
}

/** Apply a review: schedule the card, log the review (used for skill tracking), return the new state. */
export function reviewCard(id: number, grade: 0 | 1 | 2 | 3, at = now()) {
  const db = getDb();
  const c = db.prepare("select * from cards where id = ?").get(id) as Row | undefined;
  if (!c) return null;
  const prev: SrsState = { reps: Number(c.reps), interval: Number(c.interval), ease: Number(c.ease), lapses: Number(c.lapses) };
  const next = schedule(prev, grade, at);
  db.prepare("update cards set due=?, interval=?, ease=?, reps=?, lapses=? where id=?").run(next.due, next.interval, next.ease, next.reps, next.lapses, id);
  db.prepare("insert into reviews (card_id, roadmap_id, module_id, concept, grade, created_at) values (?,?,?,?,?,?)").run(
    id,
    String(c.roadmap_id),
    String(c.module_id),
    String(c.concept),
    grade,
    at,
  );
  return next;
}

/** Everything the skill map needs: every module (tested or not) and every graded signal so far. */
export function skillInputs(): { modules: ModuleInfo[]; events: SkillEvent[] } {
  const db = getDb();
  const touched = new Set<string>();
  for (const r of db.prepare("select roadmap_id, module_id from progress union select roadmap_id, module_id from messages").all() as Row[]) {
    touched.add(`${r.roadmap_id}/${r.module_id}`);
  }
  const modules: ModuleInfo[] = [];
  for (const r of db.prepare("select id, json from roadmaps order by created_at desc").all() as Row[]) {
    const road = JSON.parse(String(r.json)) as Roadmap;
    for (const m of road.modules) {
      modules.push({ roadmapId: road.id, goal: road.goal, moduleId: m.id, moduleTitle: m.title, concepts: m.concepts, touched: touched.has(`${road.id}/${m.id}`) });
    }
  }
  const events: SkillEvent[] = [];
  for (const t of db.prepare("select roadmap_id, module_id, concepts, created_at from teachbacks").all() as Row[]) {
    for (const c of JSON.parse(String(t.concepts)) as { concept: string; rating: number }[]) {
      events.push({ roadmapId: String(t.roadmap_id), moduleId: String(t.module_id), concept: c.concept, source: "teachback", value: teachbackValue(c.rating), at: Number(t.created_at) });
    }
  }
  for (const v of db.prepare("select roadmap_id, module_id, concept, grade, created_at from reviews").all() as Row[]) {
    events.push({ roadmapId: String(v.roadmap_id), moduleId: String(v.module_id), concept: String(v.concept), source: "review", value: reviewValue(Number(v.grade)), at: Number(v.created_at) });
  }
  return { modules, events };
}

export function markDone(roadmapId: string, moduleId: string): void {
  getDb().prepare("insert or ignore into progress (roadmap_id, module_id, done_at) values (?,?,?)").run(roadmapId, moduleId, now());
}

export function deleteRoadmap(id: string): void {
  getDb().prepare("delete from roadmaps where id = ?").run(id);
}

/** Study notes for a whole roadmap: plan, mind maps, full discussions and recaps. */
export function exportMarkdown(id: string): string | null {
  const b = getBundle(id);
  if (!b) return null;
  const { roadmap: r } = b;
  const name = (s: string) => (s === "learner" ? "You" : PERSONAS.find((p) => p.id === s)?.name ?? s);
  const out: string[] = [`# ${r.goal}`, `*Level: ${r.level}*`, "", r.summary, ""];
  r.modules.forEach((m, i) => {
    out.push(`## ${i + 1}. ${m.title}${b.done.includes(m.id) ? " ✓" : ""}`, `**Objective:** ${m.objective}`, `**Concepts:** ${m.concepts.join(", ")}`, "");
    const art = b.artifacts[m.id] ?? {};
    if (art.mindmap) out.push("### Mind map", "```mermaid", art.mindmap, "```", "");
    const chat = b.chats[m.id] ?? [];
    if (chat.length) {
      out.push("### Discussion", "");
      for (const c of chat) out.push(`**${name(c.speaker)}:**`, "", c.text, "");
    }
    if (art.diff) {
      try {
        const d = JSON.parse(art.diff) as Diff;
        out.push("### Perspective diff", "", "**Agree:**", ...d.agreements.map((a) => `- ${a}`), "", "**Differ:**");
        for (const x of d.differences) {
          out.push(`- **${x.topic}**`, ...x.positions.map((p) => `  - ${name(p.who)}: ${p.stance}`), `  - *Why it matters:* ${x.why}`);
        }
        out.push("", `**Takeaway:** ${d.takeaway}`, "");
      } catch {}
    }
    const tbs = b.teachbacks[m.id] ?? [];
    if (tbs.length) {
      const t = tbs[tbs.length - 1];
      out.push(`### Teach-back (latest of ${tbs.length}: ${t.score}/5)`, "", t.text, "", `**Strengths:** ${t.strengths}`);
      if (t.gaps.length) out.push("", "**Gaps:**", ...t.gaps.map((g) => `- ${g}`));
      for (const [pid, c] of Object.entries(t.critiques)) out.push("", `**${name(pid)}:** ${c}`);
      out.push("");
    }
    if (art.recap) out.push("### Teacher recap", "", art.recap, "");
  });
  return out.join("\n");
}

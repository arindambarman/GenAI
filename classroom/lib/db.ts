import type { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
create table if not exists roadmaps (
  id text primary key,
  goal text not null,
  level text not null,
  summary text not null,
  json text not null,           -- full Roadmap (modules + each agent's original proposal)
  created_at integer not null
);
create table if not exists messages (
  id integer primary key autoincrement,
  roadmap_id text not null references roadmaps(id) on delete cascade,
  module_id text not null,
  speaker text not null,         -- 'learner' or a persona id
  text text not null,
  created_at integer not null
);
create index if not exists messages_mod on messages(roadmap_id, module_id, id);
create table if not exists artifacts (
  roadmap_id text not null references roadmaps(id) on delete cascade,
  module_id text not null,
  kind text not null,            -- mindmap | recap | diff | ...
  text text not null,
  updated_at integer not null,
  primary key (roadmap_id, module_id, kind)
);
create table if not exists teachbacks (
  id integer primary key autoincrement,
  roadmap_id text not null references roadmaps(id) on delete cascade,
  module_id text not null,
  text text not null,
  score integer not null,
  concepts text not null,        -- JSON [{concept, rating}]
  strengths text not null,
  gaps text not null,            -- JSON string[]
  critiques text not null,       -- JSON {personaId: text}
  created_at integer not null
);
create index if not exists teachbacks_mod on teachbacks(roadmap_id, module_id, id);
create table if not exists cards (
  id integer primary key autoincrement,
  roadmap_id text not null references roadmaps(id) on delete cascade,
  module_id text not null,
  concept text not null,
  q text not null,
  a text not null,
  due integer not null,          -- epoch ms
  interval integer not null default 0,
  ease real not null default 2.5,
  reps integer not null default 0,
  lapses integer not null default 0,
  created_at integer not null
);
create index if not exists cards_due on cards(due);
create table if not exists reviews (
  id integer primary key autoincrement,
  card_id integer not null references cards(id) on delete cascade,
  roadmap_id text not null,
  module_id text not null,
  concept text not null,
  grade integer not null,
  created_at integer not null
);
create table if not exists progress (
  roadmap_id text not null references roadmaps(id) on delete cascade,
  module_id text not null,
  done_at integer not null,
  primary key (roadmap_id, module_id)
);
`;

// Loaded at runtime so neither webpack nor Vite tries to resolve "node:sqlite" (newer than their built-in lists).
const sqlite = process.getBuiltinModule("node:sqlite");

const g = globalThis as unknown as { __classroomDb?: DatabaseSync };

/** Singleton connection (survives Next.js hot reloads). `CLASSROOM_DB` overrides the file path; ":memory:" is used in tests. */
let schemaApplied = false; // resets when this module is hot-reloaded, so new tables reach a long-lived connection

export function getDb(): DatabaseSync {
  if (g.__classroomDb) {
    if (!schemaApplied) {
      g.__classroomDb.exec(SCHEMA); // every statement is "if not exists", so this is safe to repeat
      schemaApplied = true;
    }
    return g.__classroomDb;
  }
  schemaApplied = true;
  const file = process.env.CLASSROOM_DB ?? path.join(process.cwd(), "data", "classroom.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new sqlite.DatabaseSync(file);
  db.exec("pragma journal_mode = wal; pragma foreign_keys = on;");
  db.exec(SCHEMA);
  g.__classroomDb = db;
  return db;
}

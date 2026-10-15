"use client";
import { useCallback, useEffect, useState } from "react";
import { PERSONAS } from "@/lib/personas";
import { errText, load, postJson, readStream, save } from "@/lib/client";
import { Bundle, CardStats, Level, Message, Roadmap, RoadmapSummary } from "@/lib/types";
import LessonView from "./LessonView";
import Markdown from "./Markdown";
import ReviewView from "./ReviewView";
import SkillsView from "./SkillsView";

type Merged = { summary: string; modules: { title: string; objective: string; concepts: string[]; contributors: string[] }[] };
type Phase = "" | "drafting" | "merging";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url).catch(() => {
    throw new Error("Can't reach the classroom server. Make sure `npm run dev` is still running in the classroom folder, then retry.");
  });
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  return (await res.json()) as T;
}

/** One-off: move a roadmap that only lived in localStorage (pre-database versions) into the database. */
async function migrateLegacy(): Promise<string | null> {
  const road = load<Roadmap | null>("roadmap", null);
  if (!road || load("migrated", false)) return null;
  const chats: Record<string, Message[]> = {};
  const artifacts: Record<string, Record<string, string>> = {};
  for (const m of road.modules) {
    const c = load<Message[]>(`chat:${m.id}`, []);
    if (c.length) chats[m.id] = c;
    const mind = load(`mind:${m.id}`, "");
    const recap = load(`recap:${m.id}`, "");
    const arts: Record<string, string> = {};
    if (mind) arts.mindmap = mind;
    if (recap) arts.recap = recap;
    if (mind || recap) artifacts[m.id] = arts;
  }
  await postJson("/api/store/import", { roadmap: road, done: load<string[]>("done", []), chats, artifacts });
  save("migrated", true);
  return road.id;
}

export default function Classroom() {
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [history, setHistory] = useState<RoadmapSummary[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("");
  const [feedback, setFeedback] = useState("");
  const [showProposals, setShowProposals] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [cards, setCards] = useState<CardStats>({ due: 0, total: 0 });

  const refreshHistory = useCallback(async () => {
    setHistory((await getJson<{ roadmaps: RoadmapSummary[] }>("/api/store/roadmaps")).roadmaps);
  }, []);

  const refreshCards = useCallback(async () => {
    try {
      setCards((await getJson<{ stats: CardStats }>("/api/store/cards")).stats);
    } catch {
      /* the badge is optional; real errors surface elsewhere */
    }
  }, []);

  const openRoadmap = useCallback(async (id: string) => {
    const b = await getJson<Bundle>(`/api/store/roadmaps/${id}`);
    setBundle(b);
    setActive(null);
    save("currentId", id);
  }, []);

  useEffect(() => {
    setGoal(load("goal", ""));
    setLevel(load<Level>("level", "beginner"));
    (async () => {
      try {
        const migrated = await migrateLegacy();
        await refreshHistory();
        void refreshCards();
        const id = migrated ?? load<string | null>("currentId", null);
        if (id) {
          await openRoadmap(id).catch((e) => {
            // only forget the roadmap if it is really gone; a network blip must not lose your place
            if (String(e).includes("(404)")) save("currentId", null);
            else setError(errText(e));
          });
        }
      } catch (e) {
        setError(errText(e));
      }
      setReady(true);
    })();
  }, [openRoadmap, refreshHistory, refreshCards]);

  /** Teacher merges the proposals. Always creates a NEW roadmap id, so earlier chats never attach to different modules. */
  async function merge(g: string, l: Level, fb: string, contributions: Record<string, string>) {
    setPhase("merging");
    const out = await postJson<Merged>("/api/roadmap/merge", { goal: g, level: l, feedback: fb, contributions });
    const rid = `r${Date.now()}`;
    const road: Roadmap = {
      id: rid,
      goal: g,
      level: l,
      summary: out.summary,
      contributions,
      modules: out.modules.map((m, i) => ({ ...m, id: `${rid}-${i}` })),
    };
    await postJson("/api/store/roadmaps", road);
    await openRoadmap(rid);
    await refreshHistory();
  }

  /** Each agent drafts independently, in parallel; then the teacher merges. */
  async function build() {
    setError("");
    setDrafts({});
    setPhase("drafting");
    save("goal", goal);
    save("level", level);
    try {
      const results = await Promise.all(
        PERSONAS.map((p) =>
          readStream("/api/roadmap/contribute", { personaId: p.id, goal, level, feedback: "" }, (full) =>
            setDrafts((d) => ({ ...d, [p.id]: full })),
          ).then((text) => [p.id, text] as const),
        ),
      );
      await merge(goal, level, "", Object.fromEntries(results));
    } catch (e) {
      setError(errText(e));
    }
    setPhase("");
  }

  async function revise() {
    if (!bundle) return;
    const r = bundle.roadmap;
    setError("");
    try {
      await merge(r.goal, r.level, feedback, r.contributions);
      setFeedback("");
    } catch (e) {
      setError(errText(e));
    }
    setPhase("");
  }

  function leave() {
    setBundle(null);
    setDrafts({});
    setActive(null);
    save("currentId", null);
    void refreshHistory().catch(() => {});
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this roadmap and all its discussions? This cannot be undone.")) return;
    try {
      await fetch(`/api/store/roadmaps/${id}`, { method: "DELETE" });
      await refreshHistory();
    } catch (e) {
      setError(errText(e));
    }
  }

  async function markDone(moduleId: string) {
    if (!bundle) return;
    try {
      await postJson("/api/store/done", { roadmapId: bundle.roadmap.id, moduleId });
    } catch (e) {
      setError(errText(e));
    }
    setBundle((b) => (b ? { ...b, done: Array.from(new Set([...b.done, moduleId])) } : b));
  }

  /** Keep what LessonView writes (chat/mind map/recap) in the in-memory bundle, so re-entering a module shows it. */
  async function backToRoadmap() {
    if (bundle) await openRoadmap(bundle.roadmap.id).catch((e) => setError(errText(e)));
    void refreshCards(); // flashcards may have been added in the lesson
    setActive(null);
  }

  if (!ready) return null;

  async function openModule(roadmapId: string, moduleId: string) {
    try {
      const b = await getJson<Bundle>(`/api/store/roadmaps/${roadmapId}`);
      setBundle(b);
      save("currentId", roadmapId);
      setShowSkills(false);
      setActive(Math.max(0, b.roadmap.modules.findIndex((m) => m.id === moduleId)));
    } catch (e) {
      setError(errText(e));
    }
  }

  if (showSkills) {
    return (
      <div className="wrap">
        <SkillsView onExit={() => setShowSkills(false)} onOpenModule={openModule} />
      </div>
    );
  }

  if (reviewing) {
    return (
      <div className="wrap">
        <ReviewView
          onExit={() => {
            setReviewing(false);
            void refreshCards();
          }}
        />
      </div>
    );
  }

  const skillsBtn = (
    <button className="ghost" onClick={() => setShowSkills(true)}>
      Skills
    </button>
  );
  const reviewBtn = (
    <button className="ghost" onClick={() => setReviewing(true)} disabled={cards.total === 0}>
      Review{cards.due > 0 ? ` (${cards.due} due)` : ""}
    </button>
  );

  if (bundle && active !== null) {
    const r = bundle.roadmap;
    const m = r.modules[active];
    return (
      <div className="wrap">
        <LessonView
          key={m.id}
          roadmap={r}
          index={active}
          initial={{ messages: bundle.chats[m.id] ?? [], mindmap: bundle.artifacts[m.id]?.mindmap ?? "", recap: bundle.artifacts[m.id]?.recap ?? "", diff: bundle.artifacts[m.id]?.diff ?? "", teachbacks: bundle.teachbacks[m.id] ?? [], cardCount: bundle.cardCounts[m.id] ?? 0 }}
          finished={bundle.done.includes(m.id)}
          onBack={backToRoadmap}
          onFinish={markDone}
          onNext={
            active + 1 < r.modules.length
              ? async () => {
                  await openRoadmap(r.id).catch(() => {});
                  void refreshCards();
                  setActive(active + 1);
                }
              : undefined
          }
        />
      </div>
    );
  }

  const busy = phase !== "";

  if (!bundle) {
    return (
      <div className="wrap narrow">
        <div className="row between">
          <h1>AI Classroom</h1>
          <div className="row">
            {skillsBtn}
            {reviewBtn}
          </div>
        </div>
        <section className="panel">
          <h2>What do you want to learn?</h2>
          <p className="mute">Give a goal ("build a RAG assistant for compliance docs") or just a topic ("prompt caching"). Your classmates will each propose a roadmap and the teacher will merge them.</p>
          <textarea className="short" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="My goal or topic…" maxLength={500} disabled={busy} />
          <div className="row">
            <select value={level} onChange={(e) => setLevel(e.target.value as Level)} aria-label="Level" disabled={busy}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l[0].toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
            <button className="go" onClick={build} disabled={busy || goal.trim().length < 2}>
              {phase === "drafting" ? "Classmates are drafting…" : phase === "merging" ? "Teacher is merging…" : "Plan my roadmap"}
            </button>
          </div>
          {error && <p className="err">{error}</p>}
        </section>

        {phase === "" && history.length > 0 && (
          <section className="panel" style={{ marginTop: 16 }}>
            <h3 className="mt">Your past topics</h3>
            <ul className="history">
              {history.map((h) => (
                <li key={h.id}>
                  <div>
                    <b>{h.goal}</b>
                    <div className="mute">
                      {h.level} · {h.done}/{h.modules} modules · {h.messages} messages · {new Date(h.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="row">
                    <button className="go" onClick={() => openRoadmap(h.id).catch((e) => setError(errText(e)))}>
                      Open
                    </button>
                    <a className="ghost linkbtn" href={`/api/store/roadmaps/${h.id}/export`}>
                      Export .md
                    </a>
                    <button className="ghost" onClick={() => remove(h.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {phase !== "" && (
          <>
            <h2 style={{ marginTop: 16 }}>Each classmate drafts a roadmap</h2>
            <div className="cards">
              {PERSONAS.map((p) => (
                <div key={p.id} className="panel card" style={{ ["--c" as string]: p.color }}>
                  <h4>
                    {p.name} <span className="mute">· {p.provider}</span>
                  </h4>
                  <small>{p.style}</small>
                  <Markdown text={drafts[p.id] ?? "…"} final />
                </div>
              ))}
            </div>
            {phase === "merging" && <p className="mute">The teacher is merging these into one roadmap…</p>}
          </>
        )}
      </div>
    );
  }

  const r = bundle.roadmap;
  const completed = r.modules.filter((m) => bundle.done.includes(m.id)).length;
  return (
    <div className="wrap narrow">
      <div className="row between">
        <h1>AI Classroom</h1>
        <div className="row">
          {skillsBtn}
          {reviewBtn}
          <a className="ghost linkbtn" href={`/api/store/roadmaps/${r.id}/export`}>
            Export notes (.md)
          </a>
          <button className="ghost" onClick={leave} disabled={busy}>
            All topics
          </button>
        </div>
      </div>
      <section className="panel">
        <h2>{r.goal}</h2>
        <p className="mute">
          {r.level} · {completed}/{r.modules.length} modules done
        </p>
        <p>{r.summary}</p>
        <button className="ghost" onClick={() => setShowProposals((s) => !s)}>
          {showProposals ? "Hide" : "See"} how each classmate contributed
        </button>
        {showProposals && (
          <div className="cards">
            {PERSONAS.map((p) => (
              <div key={p.id} className="panel card" style={{ ["--c" as string]: p.color }}>
                <h4>{p.name}&apos;s proposal</h4>
                <Markdown text={r.contributions[p.id] ?? "(none)"} final />
              </div>
            ))}
          </div>
        )}
      </section>

      <ol className="modules">
        {r.modules.map((m, i) => (
          <li key={m.id} className="panel">
            <div className="row between">
              <h3 className="mt">
                {bundle.done.includes(m.id) ? "✓ " : `${i + 1}. `}
                {m.title}
              </h3>
              <button className="go" onClick={() => setActive(i)} disabled={busy}>
                {bundle.done.includes(m.id) ? "Review" : bundle.chats[m.id]?.length ? "Continue" : "Start"}
              </button>
            </div>
            <p>{m.objective}</p>
            <div className="row">
              {m.concepts.map((c) => (
                <span key={c} className="tag">
                  {c}
                </span>
              ))}
              <span className="mute">
                from {m.contributors.length ? m.contributors.map((id) => PERSONAS.find((p) => p.id === id)?.name ?? id).join(", ") : "the teacher"}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <section className="panel">
        <h3 className="mt">Not quite right?</h3>
        <p className="mute">Revising creates a new roadmap version. The current one stays in your history with its discussions.</p>
        <textarea
          className="short"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g. Skip the basics, add a module on evaluation, make it more hands-on…"
          maxLength={1000}
          disabled={busy}
        />
        <button className="go" onClick={revise} disabled={busy || feedback.trim().length < 3}>
          {phase === "merging" ? "Teacher is revising…" : "Revise roadmap"}
        </button>
        {error && <span className="err">{error}</span>}
      </section>
    </div>
  );
}

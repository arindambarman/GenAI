"use client";
import { useEffect, useState } from "react";
import { errText } from "@/lib/client";
import { bucket, Focus, Skill } from "@/lib/skills";

const LABEL = { untested: "not tested", gap: "gap", developing: "developing", solid: "solid" } as const;

interface Props {
  onExit: () => void;
  onOpenModule: (roadmapId: string, moduleId: string) => void;
}

/** Mastery per concept, grouped by roadmap and module, with a short "focus next" list. */
export default function SkillsView({ onExit, onOpenModule }: Props) {
  const [data, setData] = useState<{ skills: Skill[]; focus: Focus[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/store/skills");
        if (!res.ok) throw new Error(`request failed (${res.status})`);
        setData(await res.json());
      } catch (e) {
        setError(errText(e));
      }
    })();
  }, []);

  if (error) return <p className="err">{error}</p>;
  if (!data) return <p className="mute">Loading…</p>;

  const tested = data.skills.filter((s) => s.mastery !== null);
  const counts = { gap: 0, developing: 0, solid: 0 };
  for (const s of tested) counts[bucket(s.mastery) as keyof typeof counts]++;

  // roadmap -> module -> skills, in the order the server returned them
  const roadmaps = new Map<string, { goal: string; modules: Map<string, { title: string; skills: Skill[] }> }>();
  for (const s of data.skills) {
    const r = roadmaps.get(s.roadmapId) ?? { goal: s.goal, modules: new Map() };
    const m = r.modules.get(s.moduleId) ?? { title: s.moduleTitle, skills: [] };
    m.skills.push(s);
    r.modules.set(s.moduleId, m);
    roadmaps.set(s.roadmapId, r);
  }

  return (
    <div className="narrow-lesson">
      <div className="row between">
        <button className="ghost" onClick={onExit}>
          ← Back
        </button>
      </div>
      <h1>Skill map</h1>
      <p className="mute">
        Mastery comes from your teach-backs and flashcard reviews; recent results count most. {tested.length} of {data.skills.length} concepts tested ·{" "}
        {counts.solid} solid · {counts.developing} developing · {counts.gap} gaps.
      </p>

      {data.focus.length > 0 ? (
        <section className="panel focus">
          <h3 className="mt">Focus next</h3>
          <ul className="history">
            {data.focus.map((f) => (
              <li key={`${f.skill.moduleId}/${f.skill.concept}`}>
                <div>
                  <b>{f.concepts.length > 1 ? f.skill.moduleTitle : f.concepts[0]}</b>{" "}
                  <span className="mute">· {f.concepts.length > 1 ? f.concepts.join(", ") : f.skill.moduleTitle}</span>
                  <div className="mute">
                    {f.reason}. {f.action}.
                  </div>
                </div>
                <button className="go" onClick={() => onOpenModule(f.skill.roadmapId, f.skill.moduleId)}>
                  Open module
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="panel">
          <p style={{ margin: 0 }}>
            {tested.length === 0
              ? "No skills measured yet. Use “Teach it back” in a module and review its flashcards to start building your map."
              : "Nothing needs attention right now. Keep reviewing to stay sharp."}
          </p>
        </section>
      )}

      {Array.from(roadmaps.entries()).map(([rid, r]) => (
        <section key={rid} className="panel" style={{ marginTop: 16 }}>
          <h3 className="mt">{r.goal}</h3>
          {Array.from(r.modules.entries()).map(([mid, m]) => (
            <div key={mid} className="skillmod">
              <div className="mute">{m.title}</div>
              {m.skills.map((s) => {
                const b = bucket(s.mastery);
                return (
                  <div key={s.concept} className="skillrow">
                    <span className="skillname">{s.concept}</span>
                    <span className="bar" role="img" aria-label={s.mastery === null ? "not tested" : `${s.mastery} percent`}>
                      <span className={`fill ${b}`} style={{ width: `${s.mastery ?? 0}%` }} />
                    </span>
                    <span className="skillval">
                      {s.mastery === null ? "–" : `${s.mastery}%`} <small className="mute">{LABEL[b]}</small>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

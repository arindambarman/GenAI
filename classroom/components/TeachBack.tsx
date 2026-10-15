"use client";
import { useState } from "react";
import { PERSONAS } from "@/lib/personas";
import { errText, postJson, readStream } from "@/lib/client";
import { Roadmap, Teachback } from "@/lib/types";
import Markdown from "./Markdown";

const RATING = ["missing", "shaky", "good", "strong"];
const MIN = 40;

interface Props {
  roadmap: Roadmap;
  moduleIndex: number;
  past: Teachback[];
  onClose: () => void;
}

type Assessment = Omit<Teachback, "text" | "critiques">;

/** The learner explains the module back; classmates critique it and the teacher scores it. */
export default function TeachBackPanel({ roadmap, moduleIndex, past, onClose }: Props) {
  const mod = roadmap.modules[moduleIndex];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [critiques, setCritiques] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<Teachback[]>(past);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    setResult(null);
    setCritiques({});
    const body = { goal: roadmap.goal, level: roadmap.level, module: mod, explanation: text.trim() };
    try {
      const [assessment, ...texts] = await Promise.all([
        postJson<Assessment>("/api/lesson/teachback", body),
        ...PERSONAS.map((p) =>
          readStream("/api/lesson/critique", { ...body, personaId: p.id }, (full) => setCritiques((c) => ({ ...c, [p.id]: full }))),
        ),
      ]);
      const crit = Object.fromEntries(PERSONAS.map((p, i) => [p.id, texts[i]]));
      setResult(assessment);
      const attempt: Teachback = { ...assessment, text: text.trim(), critiques: crit };
      await postJson("/api/store/teachback", {
        roadmapId: roadmap.id,
        moduleId: mod.id,
        text: attempt.text,
        score: attempt.score,
        concepts: attempt.concepts,
        strengths: attempt.strengths,
        gaps: attempt.gaps,
        critiques: crit,
      });
      setAttempts((a) => [...a, attempt]);
    } catch (e) {
      setError(errText(e));
    }
    setBusy(false);
  }

  const showCards = Object.keys(critiques).length > 0;
  return (
    <div className="panel teachback">
      <div className="row between">
        <h4>Teach it back</h4>
        <button className="ghost" onClick={onClose} disabled={busy}>
          Close
        </button>
      </div>
      <p className="mute">
        Explain <b>{mod.title}</b> in your own words, as if teaching a colleague. No peeking at the discussion. Your classmates critique it and the teacher scores it.
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="In my own words…" maxLength={4000} disabled={busy} />
      <div className="row">
        <button className="go" onClick={submit} disabled={busy || text.trim().length < MIN}>
          {busy ? "Being reviewed…" : "Submit for feedback"}
        </button>
        <span className="mute">
          {text.trim().length < MIN ? `${MIN - text.trim().length} more characters` : `${text.length}/4000`}
        </span>
        {attempts.length > 0 && <span className="mute">Past scores: {attempts.map((a) => `${a.score}/5`).join(" → ")}</span>}
      </div>
      {error && <p className="err">{error}</p>}

      {result && (
        <div className="assess">
          <div className="score">
            {result.score}
            <span>/5</span>
          </div>
          <div>
            <p style={{ margin: 0 }}>{result.strengths}</p>
            <div className="row" style={{ margin: "8px 0" }}>
              {result.concepts.map((c) => (
                <span key={c.concept} className={`tag r${c.rating}`}>
                  {c.concept}: {RATING[c.rating]}
                </span>
              ))}
            </div>
            {result.gaps.length > 0 && (
              <>
                <b>Study next</b>
                <ul style={{ margin: "4px 0" }}>
                  {result.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {showCards && (
        <div className="cards">
          {PERSONAS.filter((p) => critiques[p.id] !== undefined).map((p) => (
            <div key={p.id} className="panel card" style={{ ["--c" as string]: p.color }}>
              <h4>
                {p.name} <span className="mute">· {p.provider}</span>
              </h4>
              <Markdown text={critiques[p.id]} final={!busy} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

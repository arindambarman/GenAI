"use client";
import { useEffect, useState } from "react";
import { errText, postJson } from "@/lib/client";
import { Grade, GRADE_LABEL, intervalLabel } from "@/lib/srs";
import { CardStats, DueCard } from "@/lib/types";

/** Spaced-repetition session: recall first, reveal, then rate how well you knew it. */
export default function ReviewView({ onExit }: { onExit: () => void }) {
  const [queue, setQueue] = useState<DueCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/store/cards");
        if (!res.ok) throw new Error(`request failed (${res.status})`);
        const data = (await res.json()) as { cards: DueCard[]; stats: CardStats };
        setQueue(data.cards);
        setTotal(data.cards.length);
        setStats(data.stats);
      } catch (e) {
        setError(errText(e));
        setQueue([]);
      }
    })();
  }, []);

  async function rate(grade: Grade) {
    if (!queue?.length || busy) return;
    const card = queue[0];
    setBusy(true);
    setError("");
    try {
      const out = await postJson<{ stats: CardStats }>("/api/store/cards/review", { id: card.id, grade });
      setStats(out.stats);
      setReviewed((n) => n + 1);
      // a forgotten card comes back at the end of this session; everything else leaves the queue
      setQueue((q) => (q ? (grade === 0 ? [...q.slice(1), card] : q.slice(1)) : q));
      if (grade === 0) setTotal((t) => t + 1);
      setRevealed(false);
      setAttempt("");
    } catch (e) {
      setError(errText(e));
    }
    setBusy(false);
  }

  const card = queue?.[0];
  const state = card ? { reps: card.reps, interval: card.interval, ease: card.ease, lapses: card.lapses } : null;

  return (
    <div className="narrow-lesson">
      <div className="row between">
        <button className="ghost" onClick={onExit}>
          ← Back
        </button>
        <span className="mute">
          {queue === null ? "Loading…" : card ? `${Math.min(reviewed + 1, total)} of ${total}` : ""}
        </span>
      </div>
      <h1>Review</h1>

      {queue !== null && !card && (
        <div className="panel">
          <h2>{reviewed > 0 ? `Nice work: ${reviewed} reviewed` : "Nothing due right now"}</h2>
          <p className="mute">
            {stats && stats.total > 0
              ? `You have ${stats.total} flashcards in total. Come back later: cards you found hard return sooner, easy ones later.`
              : "Finish a module and tap “Make flashcards” on its recap to add cards here."}
          </p>
          <button className="go" onClick={onExit}>
            Back to learning
          </button>
        </div>
      )}

      {card && state && (
        <div className="panel flash">
          <div className="mute">
            {card.moduleTitle} · <span className="tag">{card.concept}</span>
            {card.lapses > 0 && <span> · forgotten {card.lapses}×</span>}
          </div>
          <h2 className="q">{card.q}</h2>
          {!revealed ? (
            <>
              <textarea
                className="short"
                value={attempt}
                onChange={(e) => setAttempt(e.target.value)}
                placeholder="Try to recall it first (optional). Writing it out helps it stick."
                maxLength={1000}
              />
              <button className="go" onClick={() => setRevealed(true)}>
                Show answer
              </button>
            </>
          ) : (
            <>
              {attempt.trim() && (
                <p className="mute">
                  <b>Your answer:</b> {attempt}
                </p>
              )}
              <div className="answer">{card.a}</div>
              <p className="mute">How well did you know it?</p>
              <div className="row grades">
                {([0, 1, 2, 3] as Grade[]).map((g) => (
                  <button key={g} className={`go g${g}`} disabled={busy} onClick={() => rate(g)}>
                    {GRADE_LABEL[g]}
                    <small>{intervalLabel(state, g)}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

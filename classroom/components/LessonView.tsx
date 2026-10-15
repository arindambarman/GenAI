"use client";
import { useEffect, useRef, useState } from "react";
import { PERSONAS } from "@/lib/personas";
import { errText, postJson, readStream } from "@/lib/client";
import { Diff, Message, Roadmap, Teachback } from "@/lib/types";
import DiffView from "./DiffView";
import Markdown from "./Markdown";
import TeachBackPanel from "./TeachBack";
import Mermaid from "./Mermaid";

const QUICK: { label: string; directive: string }[] = [
  { label: "Give me an example", directive: "give a different, concrete worked example" },
  { label: "Draw it", directive: "include a diagram that shows how this works" },
  { label: "Quiz me", directive: "ask the learner one short question in your own style" },
  { label: "Simpler please", directive: "re-explain more simply, with an everyday analogy" },
  { label: "Go deeper", directive: "go one level deeper into the mechanics" },
];

export interface LessonInitial {
  messages: Message[];
  mindmap: string;
  recap: string;
  diff: string; // JSON of a Diff, or ""
  teachbacks: Teachback[];
  cardCount: number;
}

interface Props {
  roadmap: Roadmap;
  index: number;
  initial: LessonInitial;
  finished: boolean;
  onBack: () => void;
  onFinish: (moduleId: string) => void;
  onNext?: () => void;
}

export default function LessonView({ roadmap, index, initial, finished, onBack, onFinish, onNext }: Props) {
  const mod = roadmap.modules[index];
  const outline = roadmap.modules.map((m) => m.title);

  const [messages, setMessages] = useState<Message[]>(initial.messages);
  const [live, setLive] = useState<Record<string, string>>({});
  const [mindmap, setMindmap] = useState(initial.mindmap);
  const [mindErr, setMindErr] = useState("");
  const [recap, setRecap] = useState(initial.recap);
  const [diff, setDiff] = useState<Diff | null>(() => {
    try {
      return initial.diff ? (JSON.parse(initial.diff) as Diff) : null;
    } catch {
      return null;
    }
  });
  const [diffing, setDiffing] = useState(false);
  const [teaching, setTeaching] = useState(false);
  const [cardCount, setCardCount] = useState(initial.cardCount);
  const [carding, setCarding] = useState(false);
  const [input, setInput] = useState("");
  const [target, setTarget] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<string[]>([]);
  const msgRef = useRef<Message[]>(initial.messages);
  const lastRound = useRef({ text: "", opening: false, directive: "", base: 0 });
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const who = (id: string) => PERSONAS.find((p) => p.id === id);

  function commit(ms: Message[]) {
    msgRef.current = ms;
    setMessages(ms);
  }

  /** Persist to the database. A save failure is shown but never blocks the discussion. */
  async function persistMessages(msgs: Message[]) {
    if (!msgs.length) return;
    try {
      await postJson("/api/store/messages", { roadmapId: roadmap.id, moduleId: mod.id, messages: msgs });
    } catch (e) {
      setError(`Could not save to the database: ${errText(e)}`);
    }
  }
  async function persistArtifact(kind: "mindmap" | "recap" | "diff", text: string) {
    try {
      await postJson("/api/store/artifact", { roadmapId: roadmap.id, moduleId: mod.id, kind, text });
    } catch (e) {
      setError(`Could not save to the database: ${errText(e)}`);
    }
  }

  /**
   * Runs one discussion round. `retryIds` re-asks only the classmates who failed last time:
   * it reuses the learner message already in the thread instead of adding it again.
   */
  async function round(text: string, opening: boolean, directive: string, who2: string, retryIds?: string[]) {
    setBusy(true);
    setError("");
    setFailed([]);
    const retry = retryIds !== undefined;
    const before = retry ? msgRef.current.slice(0, lastRound.current.base) : msgRef.current;
    const withLearner = retry ? msgRef.current : opening ? before : [...before, { speaker: "learner", text }];
    if (!retry) {
      lastRound.current = { text, opening, directive, base: before.length };
      if (!opening) {
        commit(withLearner);
        void persistMessages([{ speaker: "learner", text }]);
      }
    }
    const pool = who2 === "all" ? PERSONAS : PERSONAS.filter((p) => p.id === who2);
    const targets = retry ? pool.filter((p) => retryIds.includes(p.id)) : pool;
    const results = await Promise.allSettled(
      targets.map((p) =>
        readStream(
          "/api/lesson/turn",
          { personaId: p.id, goal: roadmap.goal, level: roadmap.level, module: mod, outline, transcript: before.slice(-14), message: text, opening, directive },
          (full) => setLive((l) => ({ ...l, [p.id]: full })),
        ),
      ),
    );
    const replies: Message[] = [];
    const failedIds: string[] = [];
    const problems: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.trim()) replies.push({ speaker: targets[i].id, text: r.value });
      else {
        failedIds.push(targets[i].id);
        problems.push(r.status === "rejected" ? errText(r.reason) : "empty reply");
      }
    });
    setFailed(failedIds);
    if (failedIds.length) setError(`${failedIds.map((id) => who(id)?.name ?? id).join(", ")} could not respond: ${Array.from(new Set(problems)).join("; ")}`);
    commit([...withLearner, ...replies]);
    await persistMessages(replies);
    setLive({});
    setBusy(false);
  }

  async function loadMindmap() {
    setMindErr("");
    try {
      const out = await postJson<{ mindmap: string }>("/api/lesson/mindmap", { goal: roadmap.goal, level: roadmap.level, module: mod });
      setMindmap(out.mindmap);
      void persistArtifact("mindmap", out.mindmap);
    } catch (e) {
      setMindErr(errText(e));
    }
  }

  useEffect(() => {
    if (started.current) return; // React strict mode runs effects twice in dev
    started.current = true;
    if (!mindmap) void loadMindmap();
    if (messages.length === 0) void round("", true, "", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function send(text: string, directive = "") {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    void round(t, false, directive, target);
  }

  async function finish() {
    setBusy(true);
    setError("");
    try {
      const text = await readStream("/api/lesson/recap", { goal: roadmap.goal, module: mod, transcript: msgRef.current }, setRecap);
      await persistArtifact("recap", text);
      onFinish(mod.id);
    } catch (e) {
      setError(errText(e));
    }
    setBusy(false);
  }

  async function compare() {
    setDiffing(true);
    setError("");
    try {
      const out = await postJson<Diff>("/api/lesson/diff", { goal: roadmap.goal, module: mod, transcript: msgRef.current });
      setDiff(out);
      await persistArtifact("diff", JSON.stringify(out));
    } catch (e) {
      setError(errText(e));
    }
    setDiffing(false);
  }

  async function makeCards() {
    setCarding(true);
    setError("");
    try {
      const out = await postJson<{ cards: { concept: string; q: string; a: string }[] }>("/api/lesson/cards", {
        goal: roadmap.goal,
        module: mod,
        transcript: msgRef.current,
      });
      await postJson("/api/store/cards", { roadmapId: roadmap.id, moduleId: mod.id, cards: out.cards });
      setCardCount(out.cards.length);
    } catch (e) {
      setError(errText(e));
    }
    setCarding(false);
  }

  const agentTurns = messages.filter((m) => m.speaker !== "learner").length;
  const canCompare = agentTurns >= 3 && !busy && !diffing;
  const canFinish = messages.some((m) => m.speaker === "learner") && !busy;

  return (
    <div className="narrow-lesson">
      <div className="row between">
        <button className="ghost" onClick={onBack}>
          ← Roadmap
        </button>
        <span className="mute">
          Module {index + 1} of {roadmap.modules.length}
        </span>
      </div>
      <h1>{mod.title}</h1>
      <p className="mute">{mod.objective}</p>

      <section className="panel">
        <h3 className="mt">Mind map</h3>
        {mindmap ? <Mermaid code={mindmap} /> : mindErr ? <span className="err">{mindErr} </span> : <span className="mute">Drawing…</span>}
        {mindErr && (
          <button className="ghost" onClick={loadMindmap}>
            Retry
          </button>
        )}
      </section>

      <div className="thread">
        {messages.map((m, i) => {
          const p = who(m.speaker);
          return p ? (
            <div key={i} className="panel card" style={{ ["--c" as string]: p.color }}>
              <h4>
                {p.name} <span className="mute">· {p.provider}</span>
              </h4>
              <Markdown text={m.text} final />
            </div>
          ) : (
            <div key={i} className="you">
              <b>You</b>
              <div>{m.text}</div>
            </div>
          );
        })}
        {Object.keys(live).length > 0 && (
          <div className="cards">
            {PERSONAS.filter((p) => live[p.id] !== undefined).map((p) => (
              <div key={p.id} className="panel card" style={{ ["--c" as string]: p.color }}>
                <h4>
                  {p.name} <span className="mute">· {p.provider}</span>
                </h4>
                <Markdown text={live[p.id]} final={false} />
              </div>
            ))}
          </div>
        )}
        {busy && Object.keys(live).length === 0 && <p className="mute">Classmates are thinking…</p>}
        <div ref={endRef} />
      </div>

      {diff && <DiffView diff={diff} />}

      {teaching && <TeachBackPanel roadmap={roadmap} moduleIndex={index} past={initial.teachbacks} onClose={() => setTeaching(false)} />}

      {recap && (
        <div className="panel recap">
          <h4>Teacher recap</h4>
          <Markdown text={recap} final={!busy} />
          <div className="row">
            {cardCount === 0 ? (
              <button className="go" onClick={makeCards} disabled={carding || busy}>
                {carding ? "Writing flashcards…" : "Make flashcards"}
              </button>
            ) : (
              <span className="mute">{cardCount} flashcards added. Review them from the home screen.</span>
            )}
            {onNext && (
              <button className="go" onClick={onNext}>
                Next module →
              </button>
            )}
            <button className="ghost" onClick={onBack}>
              Back to roadmap
            </button>
          </div>
        </div>
      )}

      <div className="panel composer">
        <div className="row">
          {QUICK.map((q) => (
            <button key={q.label} className="chip" disabled={busy} onClick={() => send(q.label, q.directive)}>
              {q.label}
            </button>
          ))}
        </div>
        <textarea
          className="short"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(input);
          }}
          placeholder="Answer a question, push back, or ask anything… (Ctrl+Enter to send)"
          maxLength={2000}
          disabled={busy}
        />
        <div className="row">
          <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Ask">
            <option value="all">Ask everyone</option>
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                Ask {p.name}
              </option>
            ))}
          </select>
          <button className="go" onClick={() => send(input)} disabled={busy || input.trim().length === 0}>
            Send
          </button>
          <button className="ghost" onClick={() => setTeaching((t) => !t)} disabled={busy}>
            {teaching ? "Hide teach-back" : "Teach it back"}
          </button>
          <button className="ghost" onClick={compare} disabled={!canCompare}>
            {diffing ? "Comparing…" : diff ? "Refresh comparison" : "Compare perspectives"}
          </button>
          <button className="ghost" onClick={finish} disabled={!canFinish}>
            {finished || recap ? "Redo recap" : "Finish module & recap"}
          </button>
        </div>
        {error && <p className="err">{error}</p>}
        {failed.length > 0 && !busy && (
          <button
            className="go"
            onClick={() => {
              const r = lastRound.current;
              void round(r.text, r.opening, r.directive, "all", failed);
            }}
          >
            Retry {failed.map((id) => who(id)?.name ?? id).join(" & ")}
          </button>
        )}
      </div>
    </div>
  );
}

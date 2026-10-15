"use client";
import { PERSONAS } from "@/lib/personas";
import { Diff } from "@/lib/types";

/** Side-by-side comparison of the classmates' positions, tagged with the model behind each. */
export default function DiffView({ diff }: { diff: Diff }) {
  const who = (id: string) => PERSONAS.find((p) => p.id === id);
  return (
    <div className="panel diff">
      <h4>Perspective diff</h4>
      <h3>Where they agree</h3>
      <ul>
        {diff.agreements.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <h3>Where they differ</h3>
      {diff.differences.map((d) => (
        <div key={d.topic} className="diffrow">
          <b>{d.topic}</b>
          <div className="positions">
            {d.positions.map((p) => {
              const persona = who(p.who);
              return (
                <div key={p.who} className="pos" style={{ ["--c" as string]: persona?.color ?? "#888" }}>
                  <span className="who">
                    {persona?.name ?? p.who} <span className="mute">· {persona?.provider}</span>
                  </span>
                  {p.stance}
                </div>
              );
            })}
          </div>
          <div className="mute">Why it matters: {d.why}</div>
        </div>
      ))}
      <p className="takeaway">
        <b>Takeaway:</b> {diff.takeaway}
      </p>
    </div>
  );
}

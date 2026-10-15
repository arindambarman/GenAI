"use client";
import { useEffect, useState } from "react";

let counter = 0;

/** Renders Mermaid source to SVG in the browser; falls back to the raw source if it does not parse. */
export default function Mermaid({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let dead = false;
    const id = `mmd-${++counter}`;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default" });
        const out = await mermaid.render(id, code);
        if (!dead) setSvg(out.svg);
      } catch {
        document.getElementById(`d${id}`)?.remove(); // mermaid leaves an error node behind on parse failure
        if (!dead) setFailed(true);
      }
    })();
    return () => {
      dead = true;
    };
  }, [code]);

  if (failed) return <pre className="code">{code}</pre>;
  if (!svg) return <div className="mute">Drawing…</div>;
  return <div className="diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

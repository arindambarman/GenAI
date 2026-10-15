"use client";
import ReactMarkdown from "react-markdown";
import Mermaid from "./Mermaid";

/**
 * Renders agent markdown. Mermaid blocks only render once `final` is true: a half-streamed
 * diagram would not parse, so while streaming we show a placeholder instead.
 */
export default function Markdown({ text, final }: { text: string; final: boolean }) {
  return (
    <div className="md">
      <ReactMarkdown
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const src = String(children).replace(/\n$/, "");
            if (lang === "mermaid") return final ? <Mermaid code={src} /> : <div className="mute">Drawing diagram…</div>;
            return lang || src.includes("\n") ? <pre className="code">{src}</pre> : <code>{src}</code>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

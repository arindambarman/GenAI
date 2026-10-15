import { z } from "zod";
import { streamText } from "./providers";

/** Pull the outermost JSON object out of model text (tolerates code fences / prose). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

/** Remove a wrapping code fence, if the model added one. */
export function stripFence(text: string): string {
  return text.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
}

/** Mermaid mind maps must start with "mindmap" and be indented; reject anything else. */
export function parseMindmap(text: string): string {
  const code = stripFence(text);
  const i = code.indexOf("mindmap");
  if (i < 0) throw new Error("model did not return a mindmap");
  const out = code.slice(i);
  if (out.split("\n").length < 4) throw new Error("mindmap too small");
  return out;
}

function requireKey() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set, so the teacher is unavailable");
}

async function collect(system: string, user: string): Promise<string> {
  requireKey();
  let text = "";
  for await (const c of streamText("claude", { system, user })) text += c;
  return text;
}

/** Ask Claude for JSON and validate it with Zod; throws if invalid. */
export async function generateJson<S extends z.ZodTypeAny>(system: string, user: string, schema: S): Promise<z.infer<S>> {
  return schema.parse(extractJson(await collect(system, user)));
}

export async function generateMindmap(system: string, user: string): Promise<string> {
  return parseMindmap(await collect(system, user));
}

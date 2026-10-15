import { PERSONAS } from "@/lib/personas";
import { lessonPrompt } from "@/lib/prompts";
import { streamText } from "@/lib/providers";
import { TurnReq } from "@/lib/schemas";
import { textStream } from "@/lib/stream";

export const runtime = "nodejs";

/** One agent's contribution to the lesson discussion (streamed markdown, may include a mermaid diagram). */
export async function POST(req: Request) {
  const parsed = TurnReq.safeParse(await req.json());
  if (!parsed.success) return new Response("bad request", { status: 400 });
  const { personaId, ...rest } = parsed.data;
  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) return new Response("not found", { status: 404 });
  return textStream(streamText(persona.provider, { system: persona.system, user: lessonPrompt({ persona, ...rest }) }));
}

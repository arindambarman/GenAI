import { PERSONAS } from "@/lib/personas";
import { critiquePrompt } from "@/lib/prompts";
import { streamText } from "@/lib/providers";
import { CritiqueReq } from "@/lib/schemas";
import { textStream } from "@/lib/stream";

export const runtime = "nodejs";

/** One classmate critiques the learner's teach-back explanation (streamed). */
export async function POST(req: Request) {
  const p = CritiqueReq.safeParse(await req.json());
  if (!p.success) return new Response("bad request", { status: 400 });
  const { personaId, goal, level, module, explanation } = p.data;
  const persona = PERSONAS.find((x) => x.id === personaId);
  if (!persona) return new Response("not found", { status: 404 });
  return textStream(streamText(persona.provider, { system: persona.system, user: critiquePrompt(persona, goal, level, module, explanation) }));
}

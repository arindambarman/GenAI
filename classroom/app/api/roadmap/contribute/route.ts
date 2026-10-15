import { PERSONAS } from "@/lib/personas";
import { contributionPrompt } from "@/lib/prompts";
import { streamText } from "@/lib/providers";
import { ContributeReq } from "@/lib/schemas";
import { textStream } from "@/lib/stream";

export const runtime = "nodejs";

/** One agent drafts its own roadmap proposal (streamed). Agents never see each other's drafts here. */
export async function POST(req: Request) {
  const parsed = ContributeReq.safeParse(await req.json());
  if (!parsed.success) return new Response("bad request", { status: 400 });
  const { personaId, goal, level, feedback } = parsed.data;
  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) return new Response("not found", { status: 404 });
  return textStream(streamText(persona.provider, { system: persona.system, user: contributionPrompt(goal, level, feedback, persona) }));
}

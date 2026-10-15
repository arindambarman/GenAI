import { TEACHER } from "@/lib/personas";
import { recapPrompt } from "@/lib/prompts";
import { streamText } from "@/lib/providers";
import { RecapReq } from "@/lib/schemas";
import { textStream } from "@/lib/stream";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = RecapReq.safeParse(await req.json());
  if (!parsed.success) return new Response("bad request", { status: 400 });
  const { goal, module, transcript } = parsed.data;
  return textStream(streamText("claude", { system: TEACHER.recap, user: recapPrompt(goal, module, transcript) }));
}

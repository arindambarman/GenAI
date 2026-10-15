import { generateJson } from "@/lib/generate";
import { TEACHER } from "@/lib/personas";
import { mergePrompt } from "@/lib/prompts";
import { MergeReq, MergeRes } from "@/lib/schemas";

export const runtime = "nodejs";

/** The teacher merges the agents' proposals into one validated roadmap. */
export async function POST(req: Request) {
  const parsed = MergeReq.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { goal, level, feedback, contributions } = parsed.data;
  try {
    const out = await generateJson(TEACHER.merge, mergePrompt(goal, level, feedback, contributions), MergeRes);
    return Response.json(out);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

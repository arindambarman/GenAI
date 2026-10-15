import { generateMindmap } from "@/lib/generate";
import { TEACHER } from "@/lib/personas";
import { mindmapPrompt } from "@/lib/prompts";
import { MindmapReq } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = MindmapReq.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { goal, level, module } = parsed.data;
  try {
    return Response.json({ mindmap: await generateMindmap(TEACHER.mindmap, mindmapPrompt(goal, level, module)) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

import { generateJson } from "@/lib/generate";
import { TEACHER } from "@/lib/personas";
import { alignConcepts, teachbackPrompt } from "@/lib/prompts";
import { TeachbackReq, TeachbackRes } from "@/lib/schemas";

export const runtime = "nodejs";

/** The teacher scores the explanation and rates each key concept of the module. */
export async function POST(req: Request) {
  const p = TeachbackReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "Write at least a few sentences (40+ characters) to be assessed." }, { status: 400 });
  const { goal, level, module, explanation } = p.data;
  try {
    const out = await generateJson(TEACHER.teachback, teachbackPrompt(goal, level, module, explanation), TeachbackRes);
    return Response.json({ ...out, concepts: alignConcepts(module, out.concepts) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

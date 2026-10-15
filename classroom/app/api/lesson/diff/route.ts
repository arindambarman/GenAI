import { generateJson } from "@/lib/generate";
import { TEACHER } from "@/lib/personas";
import { diffPrompt } from "@/lib/prompts";
import { DiffReq, DiffRes } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = DiffReq.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { goal, module, transcript } = parsed.data;
  try {
    const out = await generateJson(TEACHER.diff, diffPrompt(goal, module, transcript), DiffRes);
    // a difference needs at least two known classmates after id filtering
    const differences = out.differences.filter((d) => d.positions.length >= 2);
    if (!differences.length) throw new Error("the teacher found no usable differences; try again after more discussion");
    return Response.json({ ...out, differences });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

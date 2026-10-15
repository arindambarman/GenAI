import { DoneReq } from "@/lib/schemas";
import { markDone } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = DoneReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    markDone(p.data.roadmapId, p.data.moduleId);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

import { SaveTeachbackReq } from "@/lib/schemas";
import { addTeachback } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = SaveTeachbackReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { roadmapId, moduleId, ...t } = p.data;
  try {
    addTeachback(roadmapId, moduleId, t);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

import { ArtifactReq } from "@/lib/schemas";
import { setArtifact } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = ArtifactReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    setArtifact(p.data.roadmapId, p.data.moduleId, p.data.kind, p.data.text);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

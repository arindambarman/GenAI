import { ImportReq } from "@/lib/schemas";
import { addMessages, markDone, saveRoadmap, setArtifact } from "@/lib/store";

export const runtime = "nodejs";

/** One-off import of a roadmap that previously lived only in the browser's localStorage. */
export async function POST(req: Request) {
  const p = ImportReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad import" }, { status: 400 });
  const { roadmap, done, chats, artifacts } = p.data;
  const ids = new Set(roadmap.modules.map((m) => m.id));
  try {
    saveRoadmap(roadmap);
    for (const [mid, msgs] of Object.entries(chats)) {
      for (let i = 0; i < msgs.length; i += 10) if (ids.has(mid)) addMessages(roadmap.id, mid, msgs.slice(i, i + 10));
    }
    for (const [mid, kinds] of Object.entries(artifacts)) {
      for (const [kind, text] of Object.entries(kinds)) if (ids.has(mid) && (kind === "mindmap" || kind === "recap")) setArtifact(roadmap.id, mid, kind, text);
    }
    for (const mid of done) if (ids.has(mid)) markDone(roadmap.id, mid);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

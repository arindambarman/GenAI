import { AddMessagesReq } from "@/lib/schemas";
import { addMessages } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = AddMessagesReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    addMessages(p.data.roadmapId, p.data.moduleId, p.data.messages);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

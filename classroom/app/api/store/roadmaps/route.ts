import { RoadmapSchema } from "@/lib/schemas";
import { listRoadmaps, saveRoadmap } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ roadmaps: listRoadmaps() });
}

export async function POST(req: Request) {
  const parsed = RoadmapSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "bad roadmap" }, { status: 400 });
  saveRoadmap(parsed.data);
  return Response.json({ ok: true });
}

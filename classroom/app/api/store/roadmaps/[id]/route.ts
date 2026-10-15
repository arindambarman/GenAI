import { deleteRoadmap, getBundle } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const b = getBundle(params.id);
  return b ? Response.json(b) : Response.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  deleteRoadmap(params.id);
  return Response.json({ ok: true });
}

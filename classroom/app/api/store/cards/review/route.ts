import { ReviewReq } from "@/lib/schemas";
import { cardStats, reviewCard } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = ReviewReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad request" }, { status: 400 });
  const next = reviewCard(p.data.id, p.data.grade as 0 | 1 | 2 | 3);
  if (!next) return Response.json({ error: "card not found" }, { status: 404 });
  return Response.json({ next, stats: cardStats() });
}

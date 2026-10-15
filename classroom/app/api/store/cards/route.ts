import { SaveCardsReq } from "@/lib/schemas";
import { addCards, cardStats, dueCards } from "@/lib/store";

export const runtime = "nodejs";

/** Cards due now, plus counts for the "N due" badge. */
export async function GET() {
  return Response.json({ cards: dueCards(), stats: cardStats() });
}

export async function POST(req: Request) {
  const p = SaveCardsReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    addCards(p.data.roadmapId, p.data.moduleId, p.data.cards);
    return Response.json({ ok: true, stats: cardStats() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

import { generateJson } from "@/lib/generate";
import { TEACHER } from "@/lib/personas";
import { cardsPrompt, matchConcept } from "@/lib/prompts";
import { CardsReq, CardsRes } from "@/lib/schemas";

export const runtime = "nodejs";

/** The teacher turns a studied module into flashcards, each tagged with one of the module's concepts. */
export async function POST(req: Request) {
  const p = CardsReq.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { goal, module, transcript } = p.data;
  try {
    const out = await generateJson(TEACHER.cards, cardsPrompt(goal, module, transcript), CardsRes);
    return Response.json({ cards: out.cards.map((c) => ({ ...c, concept: matchConcept(module, c.concept) })) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}

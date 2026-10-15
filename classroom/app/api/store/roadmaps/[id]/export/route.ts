import { exportMarkdown } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const md = exportMarkdown(params.id);
  if (!md) return new Response("not found", { status: 404 });
  return new Response(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="classroom-${params.id}.md"` },
  });
}

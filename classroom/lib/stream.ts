export function textStream(gen: AsyncGenerator<string>): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const c of gen) ctrl.enqueue(enc.encode(c));
      } catch (e) {
        ctrl.enqueue(enc.encode(`\n[error: ${e instanceof Error ? e.message : "failed"}]`));
      }
      ctrl.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

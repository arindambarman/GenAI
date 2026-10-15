const UNREACHABLE = "Can't reach the classroom server. Make sure `npm run dev` is still running in the classroom folder, then retry.";

async function post(url: string, body: unknown): Promise<Response> {
  try {
    return await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(UNREACHABLE); // fetch only throws on network failure, i.e. the server is down
  }
}

/** POST and consume a text stream, calling onChunk with the accumulated text. */
export async function readStream(url: string, body: unknown, onChunk: (full: string) => void): Promise<string> {
  const res = await post(url, body);
  if (!res.ok || !res.body) throw new Error(`request failed (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onChunk(full);
  }
  return full;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await post(url, body);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `request failed (${res.status})`);
  return data as T;
}

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

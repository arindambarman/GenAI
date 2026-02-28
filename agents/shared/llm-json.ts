/**
 * Strip markdown code fences from LLM output before JSON parsing.
 *
 * Claude sometimes wraps JSON responses in ```json ... ``` fences
 * even when the prompt says "respond with valid JSON only".
 */
export function parseJsonFromLLM(raw: string): unknown {
  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return JSON.parse(cleaned);
}

/**
 * Environment configuration for capstone agents.
 *
 * MOCK MODE: if ANTHROPIC_API_KEY is unset, agents run in mock mode
 * where the LLM is replaced by canned responses. Useful for offline
 * demos and CI; produces less-interesting traces but verifies the
 * architecture works.
 */
export const env = {
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  isMockMode: !process.env.ANTHROPIC_API_KEY || process.env.CAPSTONE_MOCK === "true",
  model: process.env.CAPSTONE_MODEL ?? "claude-sonnet-4-6",
  maxSteps: Number(process.env.CAPSTONE_MAX_STEPS ?? 12),
  verbose: process.env.CAPSTONE_VERBOSE === "true",
};

export function requireApiKey(): string {
  if (!env.apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Either set it, or run with CAPSTONE_MOCK=true to use mock mode.",
    );
  }
  return env.apiKey;
}

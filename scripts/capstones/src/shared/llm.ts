import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";
import type { ToolRegistry } from "./tool.js";
import { toAnthropicTools } from "./tool.js";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string | LLMContentBlock[];
}

export type LLMContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface LLMResponse {
  content: LLMContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage: { inputTokens: number; outputTokens: number };
  cost: number;
}

export interface CallLLMInput {
  system: string;
  messages: LLMMessage[];
  tools?: ToolRegistry;
  model?: string;
  maxTokens?: number;
}

const SONNET_INPUT_PER_MTOK = 3;
const SONNET_OUTPUT_PER_MTOK = 15;

function calcCost(inputTokens: number, outputTokens: number, model: string): number {
  // Sonnet pricing as default; haiku/opus adjust accordingly
  if (model.includes("haiku")) {
    return (inputTokens / 1_000_000) * 0.8 + (outputTokens / 1_000_000) * 4;
  }
  if (model.includes("opus")) {
    return (inputTokens / 1_000_000) * 15 + (outputTokens / 1_000_000) * 75;
  }
  return (inputTokens / 1_000_000) * SONNET_INPUT_PER_MTOK + (outputTokens / 1_000_000) * SONNET_OUTPUT_PER_MTOK;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.apiKey });
  }
  return client;
}

/**
 * Mock LLM: returns canned responses for offline / API-key-less demos.
 * Each agent supplies its own mock policy via the mockHandler hook.
 */
export type MockHandler = (input: CallLLMInput) => Promise<LLMResponse>;

let mockHandler: MockHandler | null = null;
export function setMockHandler(handler: MockHandler): void {
  mockHandler = handler;
}

export async function callLLM(input: CallLLMInput): Promise<LLMResponse> {
  if (env.isMockMode) {
    if (!mockHandler) {
      return defaultMockResponse(input);
    }
    return mockHandler(input);
  }

  const c = getClient();
  const model = input.model ?? env.model;
  const tools = input.tools ? toAnthropicTools(input.tools) : undefined;

  const response = await withRetry(
    () =>
      c.messages.create({
        model,
        max_tokens: input.maxTokens ?? 4096,
        system: input.system,
        messages: input.messages as Anthropic.MessageParam[],
        ...(tools ? { tools: tools as Anthropic.Tool[] } : {}),
      }),
    {
      maxAttempts: 4,
      baseDelayMs: 1000,
      onRetry: (attempt, err) => {
        console.error(
          `[LLM retry ${attempt}/4 in ${Math.round(1000 * Math.pow(2, attempt - 1))}ms] ${err instanceof Error ? err.message : String(err)}`,
        );
      },
    },
  );

  return {
    content: response.content as LLMContentBlock[],
    stopReason: response.stop_reason as LLMResponse["stopReason"],
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    cost: calcCost(response.usage.input_tokens, response.usage.output_tokens, model),
  };
}

/**
 * Retry wrapper for LLM calls. Retries on transient errors (network /
 * 5xx / 429) with exponential backoff + jitter. Permanent errors
 * (4xx other than 429) throw immediately.
 *
 * This is Lesson 9.2 (Retry & Idempotency) applied to the agent's own
 * LLM client. Without this, any transient API hiccup kills the whole
 * agent run mid-loop.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts: number; baseDelayMs: number; onRetry?: (attempt: number, err: unknown) => void },
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
      if (attempt === opts.maxAttempts) break;
      opts.onRetry?.(attempt, err);
      const baseDelay = opts.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = baseDelay * (Math.random() * 0.5);
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  // Network errors
  if (msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("network") || msg.includes("fetch failed") || msg.includes("socket hang up")) {
    return true;
  }
  // Rate limit
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("overloaded")) {
    return true;
  }
  // Transient server errors
  if (msg.includes("502") || msg.includes("503") || msg.includes("504") || msg.includes("gateway")) {
    return true;
  }
  // Anthropic-specific status patterns
  const anyErr = err as { status?: number };
  if (anyErr.status && (anyErr.status === 429 || anyErr.status >= 500)) {
    return true;
  }
  return false;
}

function defaultMockResponse(input: CallLLMInput): Promise<LLMResponse> {
  return Promise.resolve({
    content: [
      {
        type: "text",
        text: `[MOCK MODE — no API key set] System length: ${input.system.length} chars, ${input.messages.length} messages, ${
          input.tools ? Object.keys(input.tools).length : 0
        } tools. Set ANTHROPIC_API_KEY to enable real responses.`,
      },
    ],
    stopReason: "end_turn",
    usage: { inputTokens: 0, outputTokens: 0 },
    cost: 0,
  });
}

/**
 * Extract a text-only string from LLM response content blocks (ignores tool_use).
 */
export function extractText(content: LLMContentBlock[]): string {
  return content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

/**
 * Find tool_use blocks in LLM response.
 */
export function extractToolCalls(content: LLMContentBlock[]): {
  id: string;
  name: string;
  input: unknown;
}[] {
  return content
    .filter((c): c is { type: "tool_use"; id: string; name: string; input: unknown } => c.type === "tool_use")
    .map((c) => ({ id: c.id, name: c.name, input: c.input }));
}

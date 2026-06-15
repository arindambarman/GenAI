/**
 * Runner — turns a DealInput into the agent's real output + run stats.
 *
 * Two interchangeable runners behind one interface:
 *   - sdkRunner : invokes the live proposal-pricing subagent via the Claude Agent SDK.
 *   - mockRunner: returns recorded healthy output so the harness runs offline (no key).
 *
 * Select with the EVAL_RUNNER env var ("sdk" | "mock"). Default: mock.
 */
import type { DealInput } from "./dataset";

export type AgentResult = {
  ok: boolean;
  quotes: unknown[];   // raw quotes[] as the agent emitted them (pre-validation)
  raw: string;         // full final text, for debugging
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  error?: string;
};

export interface AgentRunner {
  name: string;
  run(input: DealInput): Promise<AgentResult>;
}

// ── helpers ────────────────────────────────────────────────────────────────
/** Pull the first JSON object out of model text (handles ``` fences + surrounding prose). */
function extractJsonObject(text: string): any | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const s = candidate.indexOf("{");
  const e = candidate.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  try { return JSON.parse(candidate.slice(s, e + 1)); } catch { return null; }
}
function extractQuotes(text: string): unknown[] {
  const obj = extractJsonObject(text);
  return obj && Array.isArray(obj.quotes) ? obj.quotes : [];
}

// ── live runner (Claude Agent SDK) ───────────────────────────────────────────
const PROJECT_ROOT =
  process.env.AGENT_PROJECT_ROOT || "C:/Users/arind/projects/GenAI"; // where .claude/agents/* live

export const sdkRunner: AgentRunner = {
  name: "sdk",
  async run(input) {
    // Imported lazily so `mock` runs need neither the package nor a key.
    const { query } = await import("@anthropic-ai/claude-agent-sdk");
    const t0 = Date.now();
    let finalText = "";
    let ok = false, error: string | undefined;
    let costUsd = 0, inTok = 0, outTok = 0;

    try {
      for await (const m of query({
        prompt: input.prompt,
        options: {
          cwd: PROJECT_ROOT,            // discover .claude/agents/proposal-pricing.md
          settingSources: ["project"],  // load project settings + CLAUDE.md
          permissionMode: "bypassPermissions",
          allowedTools: ["Agent", "Read", "Write", "Grep"],
          maxTurns: 6,
          // Leave model unset so the subagent's own `model: sonnet` applies.
          // Override for the whole run with EVAL_MODEL if you want.
          ...(process.env.EVAL_MODEL ? { model: process.env.EVAL_MODEL } : {}),
        },
      } as any)) {
        const msg = m as any;
        if (msg.type === "assistant") {
          const tb = msg.message?.content?.find((b: any) => b.type === "text");
          if (tb?.text) finalText = tb.text;
        }
        if (msg.type === "result") {
          if (msg.subtype === "success") {
            ok = true;
            finalText = msg.result || finalText;
            costUsd = msg.total_cost_usd ?? 0;
            inTok = msg.usage?.input_tokens ?? 0;
            outTok = msg.usage?.output_tokens ?? 0;
          } else {
            error = `agent ${msg.subtype}`;
          }
        }
      }
    } catch (e: any) {
      error = String(e?.message || e);
    }

    return {
      ok, error,
      quotes: extractQuotes(finalText),
      raw: finalText,
      costUsd, inputTokens: inTok, outputTokens: outTok,
      durationMs: Date.now() - t0,
    };
  },
};

// ── mock runner (offline) ─────────────────────────────────────────────────────
// Recorded "good" output per deal so the example PASSes with no API key.
// Flip a field (e.g. amount → "2m") to watch a quote fail first-pass validation.
const MOCK_OUTPUTS: Record<string, unknown[]> = {
  "halberd-tf-cm": [
    { product: "import_lc", currency: "USD", tenor_days: 180, amount: 2_000_000, fee_bps: 120, spread_bps: 0, indicative: true, tool: "quote_trade_finance", args_valid: true },
    { product: "cash_management", currency: "USD", tenor_days: 365, amount: 5_000_000, fee_bps: 25, spread_bps: 0, indicative: true, tool: "quote_trade_finance", args_valid: true },
  ],
  "apex-revolver": [
    { product: "revolver", currency: "USD", tenor_days: 365, amount: 5_000_000, fee_bps: 0, spread_bps: 250, indicative: true, tool: "quote_loan", args_valid: true },
  ],
  "meridian-fx": [
    { product: "fx_forward", currency: "EUR", tenor_days: 90, amount: 1_500_000, fee_bps: 0, spread_bps: 15, indicative: true, tool: "get_fx_spread", args_valid: true },
  ],
};

export const mockRunner: AgentRunner = {
  name: "mock",
  async run(input) {
    const quotes = MOCK_OUTPUTS[input.id] ?? [];
    return {
      ok: true,
      quotes,
      raw: JSON.stringify({ deal_id: input.deal_id, quotes }),
      costUsd: 0, inputTokens: 0, outputTokens: 0, durationMs: 5,
    };
  },
};

export function getRunner(): AgentRunner {
  return (process.env.EVAL_RUNNER || "mock").toLowerCase() === "sdk" ? sdkRunner : mockRunner;
}

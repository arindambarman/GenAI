export type TraceStep =
  | { kind: "thought"; text: string }
  | { kind: "tool_call"; id: string; tool: string; args: unknown }
  | { kind: "tool_result"; id: string; result: unknown; isError?: boolean }
  | { kind: "answer"; value: unknown };

export interface Trace {
  steps: TraceStep[];
  startedAt: number;
  endedAt?: number;
  totalCost: number;
  totalLLMCalls: number;
  totalToolCalls: number;
}

export function newTrace(): Trace {
  return {
    steps: [],
    startedAt: Date.now(),
    totalCost: 0,
    totalLLMCalls: 0,
    totalToolCalls: 0,
  };
}

export function formatTrace(trace: Trace, opts: { maxResultChars?: number } = {}): string {
  const maxChars = opts.maxResultChars ?? 500;
  const lines: string[] = [];
  for (const step of trace.steps) {
    if (step.kind === "thought") {
      lines.push(`💭 ${step.text}`);
    } else if (step.kind === "tool_call") {
      lines.push(`🔧 ${step.tool}(${JSON.stringify(step.args)})`);
    } else if (step.kind === "tool_result") {
      const r = typeof step.result === "string"
        ? step.result
        : JSON.stringify(step.result, null, 2);
      const truncated = r.length > maxChars ? r.slice(0, maxChars) + `…[+${r.length - maxChars} chars]` : r;
      lines.push(`${step.isError ? "❌" : "📥"} ${truncated}`);
    } else if (step.kind === "answer") {
      lines.push(`✅ Answer: ${JSON.stringify(step.value, null, 2).slice(0, 1000)}`);
    }
    lines.push("");
  }
  if (trace.endedAt) {
    const ms = trace.endedAt - trace.startedAt;
    lines.push(`─── ${ms}ms · ${trace.totalLLMCalls} LLM calls · ${trace.totalToolCalls} tool calls · $${trace.totalCost.toFixed(4)} ───`);
  }
  return lines.join("\n");
}

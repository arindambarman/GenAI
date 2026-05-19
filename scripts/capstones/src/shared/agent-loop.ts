import { env } from "./env.js";
import { callLLM, extractText, extractToolCalls } from "./llm.js";
import type { LLMContentBlock, LLMMessage } from "./llm.js";
import type { ToolRegistry } from "./tool.js";
import { newTrace } from "./trace.js";
import type { Trace } from "./trace.js";

export interface AgentLoopInput {
  systemPrompt: string;
  userMessage: string;
  tools: ToolRegistry;
  maxSteps?: number;
  model?: string;
  /**
   * If provided, every tool result is passed through this function before
   * being added back into the conversation. Useful for truncation,
   * redaction, or summarisation.
   */
  postProcessToolResult?: (toolName: string, result: unknown) => string;
  /**
   * If provided, called whenever a step is added to the trace.
   * Useful for live progress reporting.
   */
  onStep?: (trace: Trace) => void;
}

export interface AgentLoopOutput {
  trace: Trace;
  finalText: string;
  stoppedBecause: "answer" | "max_steps" | "no_tool_calls";
}

/**
 * Generic ReAct-style agent loop. Used by all three capstone agents.
 * Follows the patterns from Lesson 4.1.
 */
export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopOutput> {
  const trace = newTrace();
  const maxSteps = input.maxSteps ?? env.maxSteps;
  const messages: LLMMessage[] = [{ role: "user", content: input.userMessage }];
  let finalText = "";
  let stoppedBecause: AgentLoopOutput["stoppedBecause"] = "max_steps";

  for (let step = 0; step < maxSteps; step++) {
    const response = await callLLM({
      system: input.systemPrompt,
      messages,
      tools: input.tools,
      ...(input.model && { model: input.model }),
    });

    trace.totalLLMCalls += 1;
    trace.totalCost += response.cost;

    // Record any text the model produced
    const text = extractText(response.content);
    if (text) {
      trace.steps.push({ kind: "thought", text });
    }

    const toolCalls = extractToolCalls(response.content);

    if (toolCalls.length === 0) {
      // No tool calls = the model is done. Use the text as the answer.
      finalText = text;
      stoppedBecause = response.stopReason === "end_turn" ? "answer" : "no_tool_calls";
      trace.steps.push({ kind: "answer", value: finalText });
      input.onStep?.(trace);
      break;
    }

    // Append assistant message with tool calls
    messages.push({ role: "assistant", content: response.content });

    // Execute each tool call, append results
    const toolResultBlocks: LLMContentBlock[] = [];
    for (const call of toolCalls) {
      trace.steps.push({ kind: "tool_call", id: call.id, tool: call.name, args: call.input });
      input.onStep?.(trace);

      const tool = input.tools[call.name];
      if (!tool) {
        const errMsg = `Tool not found: ${call.name}. Available: ${Object.keys(input.tools).join(", ")}`;
        trace.steps.push({ kind: "tool_result", id: call.id, result: errMsg, isError: true });
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: errMsg,
          is_error: true,
        });
        continue;
      }

      try {
        const parsed = tool.inputSchema.parse(call.input);
        const result = await tool.handler(parsed);
        trace.totalToolCalls += 1;

        const resultStr = input.postProcessToolResult
          ? input.postProcessToolResult(call.name, result)
          : typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2);

        trace.steps.push({ kind: "tool_result", id: call.id, result });
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: resultStr,
        });
      } catch (err) {
        const errMsg = `Tool ${call.name} failed: ${err instanceof Error ? err.message : String(err)}`;
        trace.steps.push({ kind: "tool_result", id: call.id, result: errMsg, isError: true });
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: errMsg,
          is_error: true,
        });
      }
      input.onStep?.(trace);
    }

    messages.push({ role: "user", content: toolResultBlocks });
  }

  trace.endedAt = Date.now();
  return { trace, finalText, stoppedBecause };
}

import { setMockHandler } from "../shared/llm.js";
import { learnerMockHandler } from "../learner-agent/mock.js";
import { knowledgeMockHandler } from "../knowledge-agent/mock.js";
import { brainstormMockHandler } from "../brainstorm-agent/mock.js";
import { researchMockHandler } from "../research-agent/mock.js";
import type { CallLLMInput, LLMResponse, MockHandler } from "../shared/llm.js";

/**
 * Composite mock for the pipeline. Detects which agent is currently
 * being invoked by sniffing the system prompt, then dispatches to the
 * right per-agent mock.
 *
 * This avoids having to install a new mock handler before each stage.
 */
export const pipelineMockHandler: MockHandler = async (input: CallLLMInput): Promise<LLMResponse> => {
  const system = input.system;

  // Match by distinctive phrases in each agent's system prompt
  if (system.includes("Learner Agent") || system.includes("read an entire multi-module course")) {
    return learnerMockHandler(input);
  }
  if (system.includes("knowledge-management agent")) {
    return knowledgeMockHandler(input);
  }
  if (system.includes("structured-brainstorming agent")) {
    return brainstormMockHandler(input);
  }
  if (system.includes("research synthesis agent")) {
    return researchMockHandler(input);
  }

  // Fallback: end-turn with an info message
  return {
    content: [{ type: "text", text: `[MOCK PIPELINE] Unknown agent: system prompt didn't match. Length ${system.length}` }],
    stopReason: "end_turn",
    usage: { inputTokens: 50, outputTokens: 20 },
    cost: 0,
  };
};

export function installPipelineMock(): void {
  setMockHandler(pipelineMockHandler);
}

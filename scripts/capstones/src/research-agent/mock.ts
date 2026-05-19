import type { CallLLMInput, LLMResponse, MockHandler } from "../shared/llm.js";

/**
 * Mock handler for the research agent. Walks through a canned
 * sequence: search → read → read → verify × N → submit.
 *
 * Used when ANTHROPIC_API_KEY is not set; demonstrates the agent's
 * architecture without API calls.
 */
export const researchMockHandler: MockHandler = async (input: CallLLMInput): Promise<LLMResponse> => {
  const turn = countTurns(input);

  // Walk through a scripted plan
  switch (turn) {
    case 0:
      return toolCallResponse("search_corpus", { query: "ReAct reasoning acting tool use", k: 5 });
    case 1:
      return toolCallResponse("read_paper", { id: "react-2022" });
    case 2:
      return toolCallResponse("read_paper", { id: "reflexion-2023" });
    case 3:
      return toolCallResponse("read_paper", { id: "plan-and-solve-2023" });
    case 4:
      return toolCallResponse("verify_claim", {
        claim: "ReAct interleaves reasoning traces with actions.",
        source_id: "react-2022",
        passage: "We explore the use of LLMs to generate both reasoning traces and task-specific actions in an interleaved manner",
      });
    case 5:
      return toolCallResponse("verify_claim", {
        claim: "Reflexion uses verbal reflection stored across trials.",
        source_id: "reflexion-2023",
        passage: "Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer",
      });
    case 6:
      return toolCallResponse("submit_synthesis", {
        summary:
          "[MOCK SYNTHESIS] Modern LLM-agent paradigms cluster around three loop structures. ReAct (Yao et al. 2022) interleaves reasoning traces with actions, producing a tight loop where the model alternates between thinking and tool-calling [react-2022]. Reflexion (Shinn et al. 2023) wraps ReAct with a meta-loop that critiques trace outcomes and stores verbal lessons across attempts [reflexion-2023]. Plan-and-Solve (Wang et al. 2023) generates an explicit plan upfront before execution [plan-and-solve-2023]. Each paradigm trades a different combination of cost, latency, and robustness. ReAct is cheapest per step but wanders on multi-step tasks. Reflexion improves accuracy at N× cost. Plan-and-Solve is fastest for tasks with natural sub-structure but brittle when plans are wrong.\n\nProduction systems typically combine paradigms: Plan-and-Solve provides outer structure with ReAct sub-loops handling within-step uncertainty.",
        key_findings: [
          "ReAct's interleaved-reasoning loop is the baseline architecture for modern LLM agents [react-2022]",
          "Reflexion's verbal-reflection mechanism enables self-improvement without weight updates [reflexion-2023]",
          "Plan-and-Solve provides upfront structure that suits time-budgeted tasks [plan-and-solve-2023]",
        ],
        citations: [
          {
            source_id: "react-2022",
            title: "ReAct: Synergizing Reasoning and Acting in Language Models",
            passage:
              "We explore the use of LLMs to generate both reasoning traces and task-specific actions in an interleaved manner",
            supports: "ReAct interleaves reasoning traces with actions",
          },
          {
            source_id: "reflexion-2023",
            title: "Reflexion: Language Agents with Verbal Reinforcement Learning",
            passage:
              "Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer",
            supports: "Reflexion uses verbal reflection stored across trials",
          },
          {
            source_id: "plan-and-solve-2023",
            title: "Plan-and-Solve Prompting",
            passage:
              "first devising a plan to divide the entire task into smaller subtasks, then carrying out the subtasks according to the plan",
            supports: "Plan-and-Solve generates an explicit plan upfront",
          },
        ],
        confidence: 0.85,
        caveats: [
          "Mock-mode synthesis uses canned data; live mode would search more broadly.",
          "Corpus is intentionally small (6 papers); real research would draw from thousands.",
        ],
      });
    default:
      return endTurnResponse("Agent reached scripted-end-of-mock.");
  }
};

function countTurns(input: CallLLMInput): number {
  // Count assistant messages → that's the turn count for the next response
  return input.messages.filter((m) => m.role === "assistant").length;
}

function toolCallResponse(toolName: string, toolArgs: unknown): LLMResponse {
  return {
    content: [
      { type: "text", text: `[MOCK] Calling ${toolName}` },
      { type: "tool_use", id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: toolName, input: toolArgs },
    ],
    stopReason: "tool_use",
    usage: { inputTokens: 100, outputTokens: 50 },
    cost: 0,
  };
}

function endTurnResponse(text: string): LLMResponse {
  return {
    content: [{ type: "text", text }],
    stopReason: "end_turn",
    usage: { inputTokens: 50, outputTokens: 20 },
    cost: 0,
  };
}

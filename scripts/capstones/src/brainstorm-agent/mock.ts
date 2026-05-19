import type { CallLLMInput, LLMResponse, MockHandler } from "../shared/llm.js";

/**
 * Mock handler for brainstorming. Runs through 4 techniques, scores,
 * and submits. Useful for offline demos.
 */
export const brainstormMockHandler: MockHandler = async (input: CallLLMInput): Promise<LLMResponse> => {
  const turn = input.messages.filter((m) => m.role === "assistant").length;

  switch (turn) {
    case 0:
      return toolCallResponse("apply_technique", { technique: "analogy", topic: "topic" });
    case 1:
      return toolCallResponse("apply_technique", { technique: "decomposition", topic: "topic" });
    case 2:
      return toolCallResponse("apply_technique", { technique: "what_if", topic: "topic" });
    case 3:
      return toolCallResponse("apply_technique", { technique: "inversion", topic: "topic" });
    case 4:
      return toolCallResponse("score_ideas", {
        ideas: [
          { id: "idea_1", novelty: 6, feasibility: 7, impact: 8, cost: 4 },
          { id: "idea_2", novelty: 4, feasibility: 9, impact: 6, cost: 2 },
          { id: "idea_3", novelty: 8, feasibility: 5, impact: 9, cost: 6 },
          { id: "idea_4", novelty: 7, feasibility: 6, impact: 7, cost: 5 },
          { id: "idea_5", novelty: 5, feasibility: 8, impact: 5, cost: 3 },
          { id: "idea_6", novelty: 9, feasibility: 3, impact: 9, cost: 8 },
          { id: "idea_7", novelty: 6, feasibility: 7, impact: 7, cost: 4 },
          { id: "idea_8", novelty: 4, feasibility: 8, impact: 6, cost: 3 },
        ],
      });
    case 5:
      return toolCallResponse("submit_report", {
        topic: "[from input]",
        ideas: [
          { id: "idea_1", title: "Analogy: Bee-hive coordination", description: "Apply swarm intelligence patterns — multiple lightweight agents coordinating via a shared 'pheromone' signal (a metric channel). Each agent decides locally based on the metric; emergent behaviour solves the global problem.", technique: "analogy", scores: { novelty: 6, feasibility: 7, impact: 8, cost: 4 }, notes: "Mock idea" },
          { id: "idea_2", title: "Decomposition: Triage-then-resolve split", description: "Split the problem into a cheap classifier-style triage step and a deeper resolver. Triage routes 80% to easy paths; resolver handles 20% with full attention.", technique: "decomposition", scores: { novelty: 4, feasibility: 9, impact: 6, cost: 2 }, notes: "Mock idea" },
          { id: "idea_3", title: "What-if: Remove the latency constraint", description: "What if we had hours instead of seconds? Then ensemble-of-experts becomes viable. Approximate this by deferring non-critical decisions to a background batch.", technique: "what_if", scores: { novelty: 8, feasibility: 5, impact: 9, cost: 6 }, notes: "Mock idea" },
          { id: "idea_4", title: "Decomposition: Per-persona path", description: "Different user personas need different solutions. Build per-persona paths with shared infrastructure. Reduces complexity per path.", technique: "decomposition", scores: { novelty: 7, feasibility: 6, impact: 7, cost: 5 }, notes: "Mock idea" },
          { id: "idea_5", title: "Analogy: Hospital triage protocol", description: "Adopt medical triage's structured severity assessment. Pre-defined categories with explicit handling per category.", technique: "analogy", scores: { novelty: 5, feasibility: 8, impact: 5, cost: 3 }, notes: "Mock idea" },
          { id: "idea_6", title: "Inversion: Make the problem worse first", description: "What if we forced the worst-case to happen on purpose, to measure it? Adversarial stress test surfaces failure modes that 'normal' testing misses.", technique: "inversion", scores: { novelty: 9, feasibility: 3, impact: 9, cost: 8 }, notes: "Mock idea" },
          { id: "idea_7", title: "What-if: Free unlimited compute", description: "If compute were free: run 100x parallel agents on every task, pick the best by vote. Approximate with selective ensembling on hard cases only.", technique: "what_if", scores: { novelty: 6, feasibility: 7, impact: 7, cost: 4 }, notes: "Mock idea" },
          { id: "idea_8", title: "Inversion: How to guarantee failure", description: "List the things that would guarantee the project fails (no feedback, no tests, bad data). Each becomes a thing to actively prevent.", technique: "inversion", scores: { novelty: 4, feasibility: 8, impact: 6, cost: 3 }, notes: "Mock idea" },
        ],
        top_three: [
          { id: "idea_1", why_chosen: "High composite score (6.7); novel pattern; production-feasible; medium cost.", next_steps: ["Prototype with 3 agents + a shared state store", "Define the 'pheromone' metric explicitly", "Run on a 50-case eval set"] },
          { id: "idea_3", why_chosen: "Highest impact (9) with reasonable feasibility once approximated.", next_steps: ["Identify which decisions can be deferred", "Build a background-batch pipeline", "Measure latency impact of deferred decisions"] },
          { id: "idea_4", why_chosen: "Medium scores across the board; high tractability; aligns with persona-driven design we already use.", next_steps: ["List top 3 personas", "Sketch 1-page solution per persona", "Validate with 5 user interviews each"] },
        ],
        summary:
          "[MOCK] Generated 8 ideas across 4 techniques (analogy, decomposition, what_if, inversion). Top 3 selected by weighted score balancing impact, feasibility, novelty, and cost. Recommended starting with swarm-style coordination (idea_1) as the lowest-risk high-impact bet.",
      });
    default:
      return endTurnResponse("[MOCK] end");
  }
};

function toolCallResponse(toolName: string, toolArgs: unknown): LLMResponse {
  return {
    content: [
      { type: "text", text: `[MOCK] ${toolName}` },
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

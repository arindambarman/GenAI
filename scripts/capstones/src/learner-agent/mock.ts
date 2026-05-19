import type { CallLLMInput, LLMResponse, MockHandler } from "../shared/llm.js";

/**
 * Mock handler for the Learner Agent. Simulates reading 3 modules
 * (1, 4, 9) and producing a minimal but valid final report. Used
 * for offline demos.
 */
export const learnerMockHandler: MockHandler = async (input: CallLLMInput): Promise<LLMResponse> => {
  const turn = input.messages.filter((m) => m.role === "assistant").length;

  switch (turn) {
    case 0:
      return toolCallResponse("list_course_modules", {});
    case 1:
      return toolCallResponse("read_course_module", { module_id: "01" });
    case 2:
      return toolCallResponse("record_concept", {
        id: "agency-dial",
        name: "The Agency Dial",
        definition: "A 0-4 continuous measure of how much of the decision-making an LLM agent owns, from fully scripted (0) to fully autonomous (4).",
        source_lessons: ["1.1"],
        category: "foundational",
        importance: 10,
      });
    case 3:
      return toolCallResponse("record_concept", {
        id: "react-loop",
        name: "ReAct Loop",
        definition: "An agent architecture interleaving Thought, Action, Observation steps until the model emits a terminal Answer.",
        source_lessons: ["1.4"],
        category: "architecture",
        importance: 9,
      });
    case 4:
      return toolCallResponse("record_relationship", {
        from: "react-loop",
        to: "agency-dial",
        type: "specializes",
        reason: "ReAct sits at dial setting 3 — the LLM owns the loop within bounded scope.",
        source_lesson: "1.4",
      });
    case 5:
      return toolCallResponse("mark_module_processed", { module_id: "01" });
    case 6:
      return toolCallResponse("read_course_module", { module_id: "04" });
    case 7:
      return toolCallResponse("record_concept", {
        id: "sherpa-v1",
        name: "Sherpa v1 (minimal ReAct agent)",
        definition: "The 200-line ReAct implementation built in Lesson 4.1 for HSBC break classification, the starting point for the course's running example.",
        source_lessons: ["4.1"],
        category: "architecture",
        importance: 9,
      });
    case 8:
      return toolCallResponse("record_concept", {
        id: "memory-tiers",
        name: "Memory Tiers (working / episodic / procedural)",
        definition: "Three memory tiers used in production agents: working (in-context), episodic (retrievable per case), procedural (learned heuristics).",
        source_lessons: ["4.2"],
        category: "architecture",
        importance: 8,
      });
    case 9:
      return toolCallResponse("record_relationship", {
        from: "sherpa-v1",
        to: "react-loop",
        type: "uses",
        reason: "Sherpa v1 is a concrete production-shaped implementation of the ReAct loop pattern.",
        source_lesson: "4.1",
      });
    case 10:
      return toolCallResponse("record_optimization", {
        type: "missing_prerequisite",
        target_lessons: ["4.1"],
        current_state: "Lesson 4.1 references the 7-block prompt structure from 3.4 but doesn't restate it.",
        suggestion: "Add a brief recap of the 7-block structure as a sidebar at the start of 4.1.",
        rationale: "Many readers will skip 3.4 if they're already familiar with prompting basics, then hit 4.1 without context.",
        priority: "medium",
      });
    case 11:
      return toolCallResponse("mark_module_processed", { module_id: "04" });
    case 12:
      return toolCallResponse("read_course_module", { module_id: "09" });
    case 13:
      return toolCallResponse("record_concept", {
        id: "durable-execution",
        name: "Durable Execution",
        definition: "An agent execution pattern where state persists across crashes/deploys via checkpointing, enabling resume-from-failure.",
        source_lessons: ["9.1"],
        category: "operational",
        importance: 8,
      });
    case 14:
      return toolCallResponse("record_concept", {
        id: "cost-attribution",
        name: "Cost Attribution Model",
        definition: "Per-task cost breakdown by component (input tokens, output tokens, tool calls, memory) used to target optimization.",
        source_lessons: ["9.3"],
        category: "operational",
        importance: 7,
      });
    case 15:
      return toolCallResponse("record_relationship", {
        from: "durable-execution",
        to: "sherpa-v1",
        type: "extends",
        reason: "Durable execution is added on top of Sherpa's ReAct loop to survive process crashes.",
        source_lesson: "9.1",
      });
    case 16:
      return toolCallResponse("mark_module_processed", { module_id: "09" });
    case 17:
      return toolCallResponse("submit_final_report", {
        summary:
          "[MOCK SUMMARY] This course presents an end-to-end framework for designing, building, and deploying LLM agents in production. The conceptual core is the agency dial — a continuous measure of LLM autonomy. From this foundation, Modules 2-3 add the mathematical (POMDP, Bayesian) and engineering (attention, tool use) underpinnings. Modules 4 builds Sherpa, an evolving running example of a hybrid agent. Modules 5-10 add memory, multi-agent patterns, MCP tooling, evaluation, production engineering, and safety. Modules 11-13 cover business cases, advanced techniques, and frontier directions. The course's strongest contribution is treating production discipline (eval gates, observability, audit) as load-bearing rather than as an afterthought.",
        mindmap_mermaid:
          "mindmap\n  root((Agentic Systems))\n    Foundations\n      Agency dial\n      ReAct loop\n      MDP/POMDP\n    Architecture\n      Sherpa v1-v5\n      Memory tiers\n      Multi-agent\n    Production\n      Durable execution\n      Cost attribution\n      Eval gates\n    Frontier\n      Self-improvement\n      Embodied\n      Multi-agent ensembles",
        knowledge_graph_mermaid:
          "graph LR\n  agency-dial --> react-loop\n  react-loop --> sherpa-v1\n  sherpa-v1 -.extends.-> memory-tiers\n  sherpa-v1 -.extends.-> durable-execution\n  durable-execution -.requires.-> cost-attribution\n  classDef foundational fill:#fee\n  classDef architecture fill:#def\n  classDef operational fill:#cfc\n  class agency-dial,react-loop foundational\n  class sherpa-v1,memory-tiers architecture\n  class durable-execution,cost-attribution operational",
        learning_paths: [
          {
            name: "Beginner builder (12-15 hours)",
            audience: "ML engineers new to agents",
            description: "Fastest path to building a working agent. Skips heavy math; focuses on architecture and production patterns.",
            lesson_sequence: ["1.1", "1.3", "1.4", "3.2", "3.3", "4.1", "4.2", "4.5", "8.1", "9.1"],
            estimated_hours: 14,
          },
          {
            name: "Research path (25-30 hours)",
            audience: "Researchers exploring agent design",
            description: "Full mathematical treatment + recent paradigms + frontier directions.",
            lesson_sequence: ["1.1", "1.2", "2.1", "2.2", "2.3", "2.4", "3.1", "4.1", "4.3", "4.4", "6.1", "6.3", "12.1", "12.2", "13.1"],
            estimated_hours: 28,
          },
          {
            name: "Production deployment path (20 hours)",
            audience: "Platform engineers shipping agents",
            description: "Skips conceptual depth; maximises operational and safety coverage.",
            lesson_sequence: ["1.1", "1.3", "3.4", "4.1", "4.5", "7.1", "7.2", "7.4", "8.1", "8.3", "8.4", "9.1", "9.2", "9.3", "9.4", "10.1", "10.2", "10.4"],
            estimated_hours: 20,
          },
        ],
        key_insights: [
          "[MOCK] The course's single unifying concept is the agency dial — every architectural decision (single vs multi-agent, ReAct vs hybrid, etc.) maps to a dial setting.",
          "[MOCK] Sherpa evolves Lessons 4.1→9.4, accreting capabilities (memory, reflection, planning, production hardening). The narrative continuity is one of the course's strongest pedagogical features.",
          "[MOCK] Production discipline (eval gates, observability, audit) is treated as load-bearing — Modules 8-10 are emphasised at the same depth as the core architecture modules.",
        ],
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

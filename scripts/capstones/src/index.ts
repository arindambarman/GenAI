/**
 * @adaptlearn/capstones — three working capstone agents from the
 * Agentic Systems course (course/module-04-single-agent.md +
 * course/capstones.md).
 *
 * Each agent uses the shared ReAct loop in src/shared/agent-loop.ts
 * with strict tool use, Zod-validated outputs, and a mock mode that
 * runs offline (no API key).
 */
export * as research from "./research-agent/agent.js";
export * as knowledge from "./knowledge-agent/agent.js";
export * as brainstorm from "./brainstorm-agent/agent.js";

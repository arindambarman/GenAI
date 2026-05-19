import { runAgentLoop } from "../shared/agent-loop.js";
import type { Trace } from "../shared/trace.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { brainstormTools } from "./tools.js";
import {
  BrainstormReportSchema,
  type BrainstormQuery,
  type BrainstormReport,
} from "./schema.js";

export interface BrainstormResult {
  query: BrainstormQuery;
  report: BrainstormReport | null;
  trace: Trace;
  techniquesUsed: string[];
  error?: string;
}

export async function runBrainstormAgent(query: BrainstormQuery): Promise<BrainstormResult> {
  const constraintBlock = query.constraints.length > 0
    ? `\n\n# Constraints\n` + query.constraints.map((c) => `- ${c}`).join("\n")
    : "";

  const contextBlock = query.context
    ? `\n\n# Context\n${query.context}`
    : "";

  const userMessage = `# Topic\n\n${query.topic}${contextBlock}${constraintBlock}\n\n# Targets\n- Use ${query.num_techniques} different techniques\n- Generate ${query.ideas_per_technique} ideas per technique (so ~${query.num_techniques * query.ideas_per_technique} total)\n- Score all ideas via score_ideas\n- Submit top-3 with concrete next steps via submit_report`;

  const loop = await runAgentLoop({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: brainstormTools,
    maxSteps: 25,
  });

  const techniquesUsed = new Set<string>();
  for (const step of loop.trace.steps) {
    if (step.kind === "tool_call" && step.tool === "apply_technique") {
      const args = step.args as { technique: string };
      techniquesUsed.add(args.technique);
    }
  }

  const submit = loop.trace.steps
    .filter((s) => s.kind === "tool_call" && s.tool === "submit_report")
    .pop();
  let report: BrainstormReport | null = null;
  let error: string | undefined;
  if (submit && submit.kind === "tool_call") {
    try {
      report = BrainstormReportSchema.parse(submit.args);
    } catch (err) {
      error = `Failed to parse report: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    error = "Agent did not call submit_report.";
  }

  return {
    query,
    report,
    trace: loop.trace,
    techniquesUsed: [...techniquesUsed],
    ...(error && { error }),
  };
}

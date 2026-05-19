import { runAgentLoop } from "../shared/agent-loop.js";
import type { Trace } from "../shared/trace.js";
import { ADD_SYSTEM_PROMPT, ORGANIZE_SYSTEM_PROMPT, QUERY_SYSTEM_PROMPT } from "./prompts.js";
import { knowledgeTools } from "./tools.js";
import {
  KBQueryAnswerSchema,
  type KBQueryAnswer,
  OrganizationReportSchema,
  type OrganizationReport,
} from "./schema.js";

export interface QueryResult {
  mode: "query";
  question: string;
  answer: KBQueryAnswer | null;
  trace: Trace;
  error?: string;
}

export interface OrganizationResult {
  mode: "organize";
  report: OrganizationReport | null;
  trace: Trace;
  error?: string;
}

export interface AddResult {
  mode: "add";
  summary: string | null;
  notesCreated: string[];
  linksAdded: { from: string; to: string }[];
  trace: Trace;
  error?: string;
}

export async function queryKB(question: string): Promise<QueryResult> {
  const loop = await runAgentLoop({
    systemPrompt: QUERY_SYSTEM_PROMPT,
    userMessage: `# User question\n\n${question}\n\nFind relevant notes and answer. Submit via submit_answer.`,
    tools: knowledgeTools,
    maxSteps: 12,
  });

  const submit = loop.trace.steps
    .filter((s) => s.kind === "tool_call" && s.tool === "submit_answer")
    .pop();
  let answer: KBQueryAnswer | null = null;
  let error: string | undefined;
  if (submit && submit.kind === "tool_call") {
    try {
      answer = KBQueryAnswerSchema.parse({ ...submit.args as object, question });
    } catch (err) {
      error = `Failed to parse answer: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    error = "Agent did not call submit_answer.";
  }
  return { mode: "query", question, answer, trace: loop.trace, ...(error && { error }) };
}

export async function organizeKB(): Promise<OrganizationResult> {
  const loop = await runAgentLoop({
    systemPrompt: ORGANIZE_SYSTEM_PROMPT,
    userMessage:
      "Review the entire knowledge base. Identify clusters, orphans, suggested links, and gaps. Submit via submit_organization.",
    tools: knowledgeTools,
    maxSteps: 12,
  });

  const submit = loop.trace.steps
    .filter((s) => s.kind === "tool_call" && s.tool === "submit_organization")
    .pop();
  let report: OrganizationReport | null = null;
  let error: string | undefined;
  if (submit && submit.kind === "tool_call") {
    try {
      report = OrganizationReportSchema.parse(submit.args);
    } catch (err) {
      error = `Failed to parse report: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    error = "Agent did not call submit_organization.";
  }
  return { mode: "organize", report, trace: loop.trace, ...(error && { error }) };
}

export async function addToKB(userContent: string): Promise<AddResult> {
  const loop = await runAgentLoop({
    systemPrompt: ADD_SYSTEM_PROMPT,
    userMessage: `# Content to incorporate

${userContent}

Decide whether to create one or more notes. For each: query_kb first to avoid duplication, then add_note, then link_notes to relevant existing notes. Finish with submit_answer summarizing what you did.`,
    tools: knowledgeTools,
    maxSteps: 15,
  });

  const notesCreated: string[] = [];
  const linksAdded: { from: string; to: string }[] = [];
  let summary: string | null = null;

  for (const step of loop.trace.steps) {
    if (step.kind === "tool_call" && step.tool === "add_note") {
      const args = step.args as { id: string };
      notesCreated.push(args.id);
    }
    if (step.kind === "tool_call" && step.tool === "link_notes") {
      const args = step.args as { from_id: string; to_id: string };
      linksAdded.push({ from: args.from_id, to: args.to_id });
    }
    if (step.kind === "tool_call" && step.tool === "submit_answer") {
      const args = step.args as { answer: string };
      summary = args.answer;
    }
  }

  return {
    mode: "add",
    summary,
    notesCreated,
    linksAdded,
    trace: loop.trace,
  };
}

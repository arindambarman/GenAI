import { runAgentLoop } from "../shared/agent-loop.js";
import type { Trace } from "../shared/trace.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { learnerTools, getState, resetState, writeLearnerOutput } from "./tools.js";
import {
  LearningReportSchema,
  type LearningReport,
  type LearnerInput,
} from "./schema.js";

export interface LearnerResult {
  input: LearnerInput;
  report: LearningReport | null;
  recordedState: ReturnType<typeof getState>;
  outputFiles: string[];
  trace: Trace;
  error?: string;
}

/**
 * Run the Learner Agent against the course content.
 * Reads all modules, extracts concepts/relationships/optimizations,
 * synthesises a knowledge base + mindmap + knowledge graph + learning paths.
 */
export async function runLearnerAgent(
  input: LearnerInput,
  onProgress?: (trace: Trace) => void,
): Promise<LearnerResult> {
  resetState();

  const userMessage = `# Task

Read the entire course (start with list_course_modules), extract knowledge,
and produce a synthesis. Process modules sequentially, recording concepts
and relationships incrementally.

${input.modules && input.modules.length > 0
  ? `# Module filter\nOnly process these modules: ${input.modules.join(", ")}.\n`
  : "# Module filter\nProcess ALL modules.\n"}

Output directory for files (used by the runner after you finish): ${input.outputDir}

When done, submit_final_report with mindmap, knowledge graph, learning paths,
and key insights. The runner will combine your final report with the
incremental data you've recorded into a set of output files.`;

  const loop = await runAgentLoop({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: learnerTools,
    maxSteps: 80, // generous; agent needs to read 13+ modules
    ...(onProgress && { onStep: onProgress }),
    postProcessToolResult: (toolName, result) => {
      // Truncate read_course_module bodies in subsequent context to keep things manageable
      if (toolName === "read_course_module") {
        const r = result as { body: string; title: string; id: string; word_count: number };
        const max = 6000;
        if (r.body.length > max) {
          return JSON.stringify(
            {
              id: r.id,
              title: r.title,
              word_count: r.word_count,
              body: r.body.slice(0, max) + `\n\n…[truncated ${r.body.length - max} chars]`,
            },
            null,
            2,
          );
        }
      }
      return typeof result === "string" ? result : JSON.stringify(result, null, 2);
    },
  });

  const submit = loop.trace.steps
    .filter((s) => s.kind === "tool_call" && s.tool === "submit_final_report")
    .pop();

  let report: LearningReport | null = null;
  let error: string | undefined;
  let outputFiles: string[] = [];

  if (submit && submit.kind === "tool_call") {
    try {
      const recordedState = getState();
      const candidate = {
        ...(submit.args as object),
        modules_processed: recordedState.modulesRead,
        total_concepts: recordedState.concepts.length,
        total_relationships: recordedState.relationships.length,
        total_optimizations: recordedState.optimizations.length,
      };
      report = LearningReportSchema.parse(candidate);

      // Write the output files
      const written = await writeLearnerOutput(input.outputDir, {
        summary: report.summary,
        mindmap_mermaid: report.mindmap_mermaid,
        knowledge_graph_mermaid: report.knowledge_graph_mermaid,
        learning_paths: report.learning_paths,
        key_insights: report.key_insights,
      });
      outputFiles = written.writtenPaths;
    } catch (err) {
      error = `Failed to parse / write final report: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    error = "Agent did not call submit_final_report.";
  }

  return {
    input,
    report,
    recordedState: getState(),
    outputFiles,
    trace: loop.trace,
    ...(error && { error }),
  };
}

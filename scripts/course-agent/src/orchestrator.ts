import type { LessonSpec, StageResult } from "./schema.js";
import { runContentStage } from "./stages/content.js";
import { runDiagramsStage } from "./stages/diagrams.js";
import { runWebStage, type WebInput } from "./stages/web.js";

/**
 * Dial-2 orchestrator: deterministic stage sequence with hard gates.
 * Each stage either succeeds or aborts the pipeline.
 *
 * In a later milestone we'll add a dial-3 variant where an LLM decides
 * stage ordering, retries, and revision passes.
 */
export interface BuildOptions {
  spec: LessonSpec;
  markdownPath: string;
  webOutPath: string;
}

export interface BuildReport {
  ok: boolean;
  stages: StageResult[];
}

export async function buildLesson(opts: BuildOptions): Promise<BuildReport> {
  const stages: StageResult[] = [];

  const content = await runContentStage(opts.spec);
  stages.push(content);
  if (!content.ok && content.error !== "STAGE_NOT_IMPLEMENTED") {
    return { ok: false, stages };
  }

  const diagrams = await runDiagramsStage(opts.markdownPath);
  stages.push(diagrams);
  if (!diagrams.ok && diagrams.error !== "STAGE_NOT_IMPLEMENTED") {
    return { ok: false, stages };
  }

  const webInput: WebInput = {
    markdownPath: opts.markdownPath,
    lessonId: opts.spec.lesson,
    outPath: opts.webOutPath,
  };
  const web = await runWebStage(webInput);
  stages.push(web);

  return { ok: web.ok, stages };
}

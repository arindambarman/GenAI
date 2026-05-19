import type { LessonSpec, StageResult } from "../schema.js";

/**
 * Content stage: given a lesson spec, generate the lesson markdown using Claude.
 *
 * STUB — full implementation in a later pass. Will:
 *   1. Render the lesson-template prompt with the spec
 *   2. Call Claude (sonnet-4-6) with prompt-cached system prefix
 *   3. Validate output structure via ParsedLessonSchema (round-trip through the parser)
 *   4. Write the lesson markdown into the appropriate module file
 */
export async function runContentStage(spec: LessonSpec): Promise<StageResult> {
  return {
    stage: "content",
    ok: false,
    outputs: [],
    warnings: [`Content stage not yet implemented (would have generated lesson ${spec.lesson})`],
    error: "STAGE_NOT_IMPLEMENTED",
  };
}

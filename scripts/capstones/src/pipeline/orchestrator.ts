import type { PipelineState, StageResult } from "./schema.js";

export interface PipelineStage {
  name: string;
  description: string;
  /**
   * Run the stage. Mutates state in-place. Returns the updated state.
   * Stage should track its own cost/LLM calls and update state totals.
   */
  run: (state: PipelineState, hooks: StageHooks) => Promise<PipelineState>;
  /**
   * Whether the stage can be skipped if `useCachedLearner` was provided
   * or if a previous run already populated the relevant state.
   */
  skippable?: (state: PipelineState) => boolean;
}

export interface StageHooks {
  onProgress: (message: string) => void;
  onSubStep: (description: string) => void;
}

export interface PipelineRunOptions {
  stages: PipelineStage[];
  state: PipelineState;
  onStageStart?: (stage: PipelineStage, idx: number, total: number) => void;
  onStageEnd?: (stage: PipelineStage, result: StageResult) => void;
  onProgress?: (stage: PipelineStage, message: string) => void;
  onError?: (stage: PipelineStage, error: Error) => "continue" | "abort";
}

/**
 * Run stages sequentially against state. Records timing, cost, errors
 * per stage. Default error policy: abort on any stage failure.
 */
export async function runPipeline(opts: PipelineRunOptions): Promise<PipelineState> {
  for (let i = 0; i < opts.stages.length; i++) {
    const stage = opts.stages[i];
    const startedAt = Date.now();

    opts.onStageStart?.(stage, i, opts.stages.length);

    if (stage.skippable?.(opts.state)) {
      const result: StageResult = {
        stage: stage.name,
        ok: true,
        startedAt,
        endedAt: startedAt,
        durationMs: 0,
        cost: 0,
        llmCalls: 0,
        toolCalls: 0,
        note: "skipped (already satisfied)",
      };
      opts.state.stageResults.push(result);
      opts.onStageEnd?.(stage, result);
      continue;
    }

    const costBefore = opts.state.totalCost;
    const llmBefore = opts.state.totalLLMCalls;
    const toolBefore = opts.state.totalToolCalls;

    try {
      opts.state = await stage.run(opts.state, {
        onProgress: (msg) => opts.onProgress?.(stage, msg),
        onSubStep: (msg) => opts.onProgress?.(stage, `  ${msg}`),
      });

      const endedAt = Date.now();
      const result: StageResult = {
        stage: stage.name,
        ok: true,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        cost: opts.state.totalCost - costBefore,
        llmCalls: opts.state.totalLLMCalls - llmBefore,
        toolCalls: opts.state.totalToolCalls - toolBefore,
      };
      opts.state.stageResults.push(result);
      opts.onStageEnd?.(stage, result);
    } catch (err) {
      const endedAt = Date.now();
      const error = err instanceof Error ? err.message : String(err);
      const result: StageResult = {
        stage: stage.name,
        ok: false,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        cost: opts.state.totalCost - costBefore,
        llmCalls: opts.state.totalLLMCalls - llmBefore,
        toolCalls: opts.state.totalToolCalls - toolBefore,
        error,
      };
      opts.state.stageResults.push(result);
      opts.onStageEnd?.(stage, result);

      const action = opts.onError?.(stage, err as Error) ?? "abort";
      if (action === "abort") {
        return opts.state;
      }
    }
  }

  return opts.state;
}

"use client";

import { useState, useEffect, useRef } from "react";

const STAGES = [
  { label: "Classifying intent", target: 15 },
  { label: "Researching topic via web search", target: 40 },
  { label: "Synthesizing research with AI", target: 65 },
  { label: "Assessing skills and saving to database", target: 85 },
  { label: "Finalizing skill map", target: 95 },
];

/** Interval between progress ticks in ms. */
const TICK_MS = 300;

interface ScoutProgressBarProps {
  /** When true, the bar snaps to 100% and shows the done state. */
  done: boolean;
  /** Topic being researched. */
  topic?: string;
  /** Number of skills found (shown in done state). */
  skillCount?: number;
}

export default function ScoutProgressBar({ done, topic, skillCount }: ScoutProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (done) {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setStageIdx(STAGES.length);
      setShowDone(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const currentStage = STAGES[stageIdx];
        if (!currentStage) return prev;

        const target = currentStage.target;

        if (prev >= target) {
          if (stageIdx < STAGES.length - 1) {
            setStageIdx((s) => s + 1);
          }
          return prev;
        }

        const remaining = target - prev;
        const step = Math.max(0.5, remaining * 0.08);
        return Math.min(prev + step, target);
      });
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [done, stageIdx]);

  const barColor = showDone ? "bg-green-500" : "bg-blue-500";
  const topicLabel = topic ?? "your topic";

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] w-96 rounded-lg bg-white border border-gray-200 px-4 py-3">
        {/* Stage checklist */}
        <div className="space-y-1.5 mb-3">
          {STAGES.map((stage, i) => {
            const isCompleted = i < stageIdx;
            const isActive = i === stageIdx && !showDone;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {isCompleted ? (
                  <span className="text-green-500 flex-shrink-0">{"\u2713"}</span>
                ) : isActive ? (
                  <span className="text-blue-500 flex-shrink-0 animate-pulse">{"\u25CF"}</span>
                ) : (
                  <span className="text-gray-300 flex-shrink-0">{"\u25CB"}</span>
                )}
                <span
                  className={
                    isCompleted
                      ? "text-gray-500"
                      : isActive
                        ? "text-gray-900 font-medium"
                        : "text-gray-400"
                  }
                >
                  {stage.label}
                </span>
              </div>
            );
          })}

          {/* Final done line */}
          {showDone && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-500 flex-shrink-0">{"\u2713"}</span>
              <span className="text-green-700 font-medium">
                Research by Scout Agent is complete
                {skillCount != null ? ` \u2014 ${skillCount} skills identified` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar track */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-500">
            {showDone
              ? `Scout Agent \u2014 "${topicLabel}"`
              : `Researching "${topicLabel}"...`}
          </p>
          <p className="text-xs text-gray-400">
            {Math.round(progress)}%
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

const STAGES = [
  { label: "Classifying intent...", target: 15 },
  { label: "Researching topic via web search...", target: 40 },
  { label: "Synthesizing research with AI...", target: 65 },
  { label: "Assessing skills...", target: 85 },
  { label: "Finalizing skill map...", target: 95 },
];

/** Interval between progress ticks in ms. */
const TICK_MS = 300;

interface ScoutProgressBarProps {
  /** When true, the bar snaps to 100% and shows the done message. */
  done: boolean;
  /** Topic being researched (shown in stage labels). */
  topic?: string;
}

export default function ScoutProgressBar({ done, topic }: ScoutProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (done) {
      // Snap to 100%
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setShowDone(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        // Find which stage we're in
        const currentStage = STAGES[stageIdx];
        if (!currentStage) return prev;

        const target = currentStage.target;

        if (prev >= target) {
          // Move to next stage
          if (stageIdx < STAGES.length - 1) {
            setStageIdx((s) => s + 1);
          }
          return prev;
        }

        // Ease toward target — move faster at start, slower near target
        const remaining = target - prev;
        const step = Math.max(0.5, remaining * 0.08);
        return Math.min(prev + step, target);
      });
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [done, stageIdx]);

  const currentLabel = showDone
    ? `Skill research is done. Content is being created for "${topic ?? "your topic"}"...`
    : STAGES[stageIdx]?.label ?? "Processing...";

  const barColor = showDone ? "bg-green-500" : "bg-blue-500";

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] w-80 rounded-lg bg-white border border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-700 mb-2">{currentLabel}</p>

        {/* Progress bar track */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-gray-400 mt-1 text-right">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}

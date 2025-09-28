"use client";

import { scoreToHex, formatScoreRing, clamp } from "@/lib/utils";

interface ScoreIndicatorProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  caption?: string;
}

const SIZE_MAP: Record<NonNullable<ScoreIndicatorProps["size"]>, number> = {
  sm: 52,
  md: 68,
  lg: 92,
};

export function ScoreIndicator({
  score,
  size = "md",
  label,
  caption,
}: ScoreIndicatorProps) {
  const dimension = SIZE_MAP[size];
  const boundedScore = clamp(score, 0, 100);
  const hex = scoreToHex(boundedScore);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative flex items-center justify-center rounded-full bg-slate-900"
        style={{
          width: dimension,
          height: dimension,
          padding: 6,
          ...formatScoreRing(boundedScore),
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950">
          <span className="text-lg font-semibold" style={{ color: hex }}>
            {boundedScore}
          </span>
        </div>
      </div>
      {label ? (
        <span className="text-xs font-medium text-slate-300">{label}</span>
      ) : null}
      {caption ? (
        <span className="text-[11px] text-slate-500">{caption}</span>
      ) : null}
    </div>
  );
}

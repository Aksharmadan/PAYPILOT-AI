"use client";

import { useEffect, useState } from "react";

export function RiskGauge({ score, label = "Revenue Health" }: { score: number; label?: string }) {
  const [progress, setProgress] = useState(score);

  useEffect(() => {
    // Re-animate if score changes dynamically
    setProgress(score);
  }, [score]);

  const circumference = Math.PI * 80;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="200" height="112" viewBox="0 0 200 112">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#1F2023"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#jadeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <defs>
          <linearGradient id="jadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#189670" />
            <stop offset="100%" stopColor="#4ADE94" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute top-[46px] flex flex-col items-center">
        <span className="font-mono text-3xl font-semibold text-ink-0 tabular-nums">
          {Math.round(progress)}
        </span>
        <span className="text-xs text-ink-300 mt-1">{label}</span>
      </div>
    </div>
  );
}

"use client";

import { type ReactNode } from "react";

export function ComingSoon({
  icon,
  title,
  description,
  phase,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-32 max-w-md mx-auto">
      <div className="h-12 w-12 rounded-xl bg-base-100 border border-base-border flex items-center justify-center mb-5 text-ink-300">
        {icon}
      </div>
      <h2 className="text-lg font-medium text-ink-0 mb-2">{title}</h2>
      <p className="text-sm text-ink-300 leading-relaxed">{description}</p>
      {phase && (
        <span className="mt-5 text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
          {phase}
        </span>
      )}
    </div>
  );
}

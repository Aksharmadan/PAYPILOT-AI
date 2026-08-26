"use client";

import { Sparkles, ArrowRight } from "lucide-react";

const suggestions = [
  "Why is recovery rate falling?",
  "Find my highest-value opportunities",
  "Explain today's revenue loss",
  "Which customers are likely to churn?",
  "Compare AI vs control recovery",
];

export function AICommandBar() {
  return (
    <div className="bg-gradient-to-b from-violet-500/[0.08] to-transparent border border-violet-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4 text-violet-400">
        <Sparkles size={16} />
        <span className="text-sm font-medium">Ask PayPilot</span>
      </div>

      <button className="w-full flex items-center justify-between bg-base-100 border border-base-border rounded-xl px-4 py-3.5 text-left hover:border-violet-500/40 transition-colors group">
        <span className="text-ink-300 text-sm">What would you like to know?</span>
        <ArrowRight size={16} className="text-ink-500 group-hover:text-violet-400 transition-colors" />
      </button>

      <div className="flex flex-wrap gap-2 mt-4">
        {suggestions.map((s) => (
          <button
            key={s}
            className="text-xs px-3 py-1.5 rounded-full bg-base-100 border border-base-border text-ink-300 hover:text-ink-0 hover:border-ink-500 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

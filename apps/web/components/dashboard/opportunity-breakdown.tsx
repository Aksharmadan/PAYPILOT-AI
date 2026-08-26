"use client";

import { formatINR } from "@/lib/format";

const COLOR_BY_SOURCE: Record<string, string> = {
  "Failed Payments": "bg-coral-500",
  "Checkout Abandonment": "bg-amber-500",
  "Subscriptions": "bg-violet-500",
  "Other": "bg-ink-500",
};

interface Segment {
  source: string;
  amount: number;
}

export function OpportunityBreakdown({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.amount, 0) || 1;

  return (
    <div className="bg-base-100 border border-base-border rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-medium text-ink-100">Revenue at Risk, by Source</h3>
        <span className="font-mono text-sm text-ink-300 tabular-nums">{formatINR(total)}</span>
      </div>

      <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-0.5">
        {segments.map((s) => (
          <div
            key={s.source}
            className={`${COLOR_BY_SOURCE[s.source] ?? "bg-ink-500"} transition-all duration-700`}
            style={{ width: `${(s.amount / total) * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {segments.map((s) => (
          <div key={s.source} className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${COLOR_BY_SOURCE[s.source] ?? "bg-ink-500"}`} />
            <span className="text-ink-300 flex-1">{s.source}</span>
            <span className="font-mono text-ink-0 tabular-nums">{formatINR(s.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

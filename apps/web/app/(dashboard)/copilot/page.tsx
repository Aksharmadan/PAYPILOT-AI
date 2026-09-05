import { Suspense } from "react";
import CopilotClient from "@/components/dashboard/copilot-client";

function CopilotSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 h-[calc(100vh-6.5rem)] flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-base-border/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl skeleton-shimmer"/>
          <div className="space-y-1.5">
            <div className="h-4 w-48 rounded-lg skeleton-shimmer"/>
            <div className="h-3 w-32 rounded-lg skeleton-shimmer"/>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-xl skeleton-shimmer"/>
          <div className="h-8 w-32 rounded-xl skeleton-shimmer"/>
        </div>
      </div>
      {/* Thread area skeleton */}
      <div className="flex-1 card-surface rounded-2xl p-5">
        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
          <div className="h-16 w-16 rounded-3xl skeleton-shimmer"/>
          <div className="h-4 w-48 rounded-lg skeleton-shimmer"/>
          <div className="h-3 w-64 rounded-lg skeleton-shimmer"/>
        </div>
      </div>
      {/* Chips skeleton */}
      <div className="flex gap-2 shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-36 rounded-xl skeleton-shimmer"/>
        ))}
      </div>
      {/* Input skeleton */}
      <div className="flex gap-2 shrink-0">
        <div className="flex-1 h-[50px] rounded-2xl skeleton-shimmer"/>
        <div className="h-[50px] w-[50px] rounded-2xl skeleton-shimmer"/>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<CopilotSkeleton/>}>
      <CopilotClient/>
    </Suspense>
  );
}

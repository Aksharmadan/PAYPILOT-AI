"use client";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Thin jade heartbeat line behind the Command Center revenue figure. */
export function RevenuePulse({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <svg
      className={className}
      viewBox="0 0 420 64"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M0 32 H70 L88 32 L102 12 L118 52 L134 32 H190 L206 32 L220 8 L238 56 L254 32 H310 L326 32 L340 18 L356 46 L372 32 H420"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-jade-500/35"
        style={
          reduced
            ? undefined
            : {
                strokeDasharray: "180 320",
                animation: "pulse-dash 3.6s linear infinite",
              }
        }
      />
      {!reduced ? (
        <path
          d="M0 32 H70 L88 32 L102 12 L118 52 L134 32 H190 L206 32 L220 8 L238 56 L254 32 H310 L326 32 L340 18 L356 46 L372 32 H420"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-jade-400/20"
          style={{
            strokeDasharray: "90 410",
            animation: "pulse-dash 3.6s linear infinite",
            animationDelay: "-1.2s",
          }}
        />
      ) : null}
    </svg>
  );
}

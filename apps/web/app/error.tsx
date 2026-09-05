"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service if available
    console.error("[PayPilot Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-0 p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-500/10 border border-coral-500/20">
          <AlertTriangle size={28} className="text-coral-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-ink-0">Something went wrong</h1>
          <p className="text-sm text-ink-400 leading-relaxed">
            An unexpected error occurred. This has been logged.
            {error.digest && (
              <span className="block mt-1 font-mono text-xs text-ink-600">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-base-200 border border-base-border px-5 py-2.5 text-sm font-medium text-ink-0 hover:bg-base-300 transition"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}

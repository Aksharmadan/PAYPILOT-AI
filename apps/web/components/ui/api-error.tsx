"use client";

import { AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { useState } from "react";

interface ApiErrorProps {
  message?: string;
  onRetry?: () => void;
  isTimeout?: boolean;
}

/**
 * Shown when the backend API is unavailable (e.g. Render free tier cold start).
 * Never shows fake success — always explains what's happening.
 */
export function ApiError({ message, onRetry, isTimeout = false }: ApiErrorProps) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-5 p-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        {isTimeout
          ? <Clock size={24} className="text-amber-400" />
          : <AlertTriangle size={24} className="text-amber-400" />
        }
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-sm font-bold text-ink-0">
          {isTimeout ? "Backend is starting up…" : "Unable to reach API"}
        </h3>
        <p className="text-xs text-ink-400 leading-relaxed">
          {isTimeout
            ? "The PayPilot API is waking up from sleep (Render free tier). This usually takes 30–60 seconds. Please wait and retry."
            : (message || "The API server is temporarily unavailable. Please check your connection and try again.")
          }
        </p>
      </div>

      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-60"
        >
          <RefreshCw size={13} className={retrying ? "animate-spin" : ""} />
          {retrying ? "Retrying…" : "Retry"}
        </button>
      )}
    </div>
  );
}

/**
 * Small inline error state for cards/panels — doesn't fill the screen.
 */
export function InlineApiError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
      <Clock size={14} className="text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300 flex-1">
        {message || "API unavailable — backend may be starting up (30–60s on free tier)"}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="text-2xs font-mono text-amber-400 hover:text-amber-300 underline shrink-0">
          retry
        </button>
      )}
    </div>
  );
}

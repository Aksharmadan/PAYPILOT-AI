"use client";

import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-base-border bg-base-50/80 px-6 backdrop-blur-xl">
      <button
        type="button"
        onClick={onOpenPalette}
        className="group flex w-80 items-center gap-2 rounded-lg border border-base-border bg-base-100 px-3 py-2 text-sm text-ink-300 shadow-card transition hover:-translate-y-0.5 hover:border-jade-500/40 hover:text-ink-0"
      >
        <Search size={14} />
        <span>Search or ask PayPilot...</span>
        <kbd className="ml-auto rounded bg-base-200 px-1.5 py-0.5 font-mono text-[10px] text-ink-500 transition group-hover:text-ink-300">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <span className="rounded-full border border-jade-500/20 bg-jade-500/10 px-2 py-1 text-xs text-jade-400">
          Live
        </span>
        <ThemeToggle />
        <div className="h-9 w-9 rounded-lg border border-base-border bg-base-100 shadow-card" />
      </div>
    </header>
  );
}

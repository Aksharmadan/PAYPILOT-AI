"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  // Start assuming dark (matches the blocking script default) to avoid hydration mismatch
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Read whatever the blocking script already applied
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("paypilot-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button
      onClick={toggle}
      className="h-8 w-8 rounded-xl border border-base-border bg-base-100 text-ink-300 transition-all hover:text-ink-0 hover:border-violet-500/30 flex items-center justify-center"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark
        ? <Moon size={14} className="text-ink-300" />
        : <Sun  size={14} className="text-amber-400" />
      }
    </button>
  );
}

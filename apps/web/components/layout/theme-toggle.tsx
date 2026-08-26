"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("paypilot-theme");
    const nextDark = stored ? stored === "dark" : true;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
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
      className="h-9 w-9 rounded-lg border border-base-border bg-base-100 text-ink-300 shadow-card transition hover:-translate-y-0.5 hover:text-ink-0"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Moon size={16} className="mx-auto" /> : <Sun size={16} className="mx-auto" />}
    </button>
  );
}

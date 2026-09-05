"use client";

import { Search, LogOut, ExternalLink, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

/* ── Page title map ─────────────────────────────────────── */
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/command-center":        { title: "Command Center",    subtitle: "Revenue cockpit" },
  "/revenue/opportunities": { title: "Opportunities",     subtitle: "Recovery queue" },
  "/revenue/recovery":      { title: "Recovery",          subtitle: "Execution monitor" },
  "/customers":             { title: "Customers",         subtitle: "Customer 360" },
  "/payments":              { title: "Payments",          subtitle: "Transaction log" },
  "/subscriptions":         { title: "Subscriptions",     subtitle: "Recurring revenue" },
  "/risk":                  { title: "Risk Scoring",      subtitle: "Recoverability intelligence" },
  "/risk/churn":            { title: "Churn Radar",       subtitle: "Retention risk" },
  "/risk/renewal":          { title: "Renewal Radar",     subtitle: "Upcoming renewals" },
  "/copilot":               { title: "AI Analyst",        subtitle: "Revenue intelligence" },
  "/revenue/experiments":   { title: "Experiments",       subtitle: "Strategy A/B lab" },
  "/automation":            { title: "Automation",        subtitle: "Policy engine" },
  "/analytics":             { title: "Business Impact",   subtitle: "Executive outcomes" },
  "/audit":                 { title: "Audit Trail",       subtitle: "Forensic record" },
  "/demo":                  { title: "Demo Mode",         subtitle: "Scenario playground" },
  "/settings":              { title: "Settings",          subtitle: "Configuration" },
};

function usePageMeta(pathname: string) {
  // Exact match first, then prefix match
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(PAGE_TITLES)
    .filter(k => k !== "/" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return PAGE_TITLES[prefix] ?? { title: "PayPilot", subtitle: "" };
}

/* ── Topbar ─────────────────────────────────────────────── */
export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const meta     = usePageMeta(pathname);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="h-14 shrink-0 z-10 flex items-center justify-between border-b border-base-border/80 bg-base-0/90 px-5 backdrop-blur-xl gap-4">

      {/* ── Left: page title ─────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-ink-0 tracking-tight leading-none truncate">
            {meta.title}
          </h1>
          {meta.subtitle && (
            <p className="text-2xs text-ink-500 font-mono mt-0.5 leading-none">{meta.subtitle}</p>
          )}
        </div>
      </div>

      {/* ── Centre: search trigger ────────── */}
      <button
        type="button"
        onClick={onOpenPalette}
        className="group hidden sm:flex items-center gap-2 rounded-xl border border-base-border bg-base-100/80 px-3 py-1.5 text-xs text-ink-400 w-52 lg:w-64 transition-all duration-160 hover:border-violet-500/30 hover:bg-base-200/80 hover:text-ink-300"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        <Search size={12} className="shrink-0" />
        <span className="flex-1 text-left text-2xs">Search or ask PayPilot…</span>
        <kbd className="rounded-md border border-base-border bg-base-200 px-1.5 py-0.5 font-mono text-2xs text-ink-500 transition group-hover:text-ink-300">
          ⌘K
        </kbd>
      </button>

      {/* ── Right: actions ────────────────── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Product story pill */}
        <a
          href="/landing"
          className="hidden lg:flex items-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-500/8 px-2.5 py-1.5 text-2xs font-mono font-semibold text-violet-400 hover:bg-violet-500/15 hover:border-violet-500/40 transition-all duration-160"
        >
          <ExternalLink size={10} />
          Product Story
        </a>

        {/* Live telemetry badge */}
        <div className="flex items-center gap-1.5 rounded-xl border border-jade-500/20 bg-jade-500/8 px-2.5 py-1.5">
          {/* Pulsing ring dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inset-0 rounded-full bg-jade-400 opacity-30 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-jade-400 shadow-[0_0_6px_rgba(34,192,138,0.9)]" />
          </span>
          <span className="text-2xs font-mono text-jade-400 font-semibold">LIVE</span>
        </div>

        {/* Notification bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Mobile search trigger */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="sm:hidden flex h-8 w-8 items-center justify-center rounded-xl border border-base-border bg-base-100 text-ink-400 hover:text-ink-0 transition-colors"
          aria-label="Open search"
        >
          <Search size={14} />
        </button>

        {/* User avatar with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="group flex items-center gap-2 rounded-xl border border-base-border bg-base-100 px-2 py-1.5 transition-all duration-160 hover:border-violet-500/30 hover:bg-base-200/80"
            aria-label="User menu"
            aria-expanded={menuOpen}
          >
            {/* Avatar */}
            <div className="relative h-6 w-6">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-500/30">
                <span className="text-2xs font-bold text-white">DM</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-jade-400 border border-base-100" />
            </div>
            <ChevronDown size={11} className={`text-ink-500 transition-transform duration-160 ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="absolute right-0 top-10 w-52 rounded-2xl border border-base-border glass-modal overflow-hidden z-50"
              style={{ animation: "enter 160ms cubic-bezier(0.16,1,0.3,1) both" }}
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs font-semibold text-ink-0">Demo Merchant</p>
                <p className="text-2xs text-ink-500 mt-0.5 font-mono">demo@paypilot.dev</p>
              </div>
              <div className="p-1.5">
                <a
                  href="/landing"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-ink-300 hover:text-ink-0 hover:bg-white/5 transition-colors"
                >
                  <ExternalLink size={13} />
                  Product Story
                </a>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-coral-400 hover:bg-coral-500/10 transition-colors disabled:opacity-60"
                >
                  <LogOut size={13} />
                  {loggingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

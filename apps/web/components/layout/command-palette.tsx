"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CreditCard,
  FileText,
  FlaskConical,
  LayoutGrid,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ease, paletteMotion } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type PaletteItem = {
  id: string;
  label: string;
  href?: string;
  hint?: string;
  icon: LucideIcon;
  kind: "route" | "action";
  keywords?: string[];
};

const ROUTES: PaletteItem[] = [
  { id: "home", label: "Command Center", href: "/", icon: LayoutGrid, kind: "route" },
  { id: "opportunities", label: "Recovery Opportunities", href: "/revenue/opportunities", icon: TrendingUp, kind: "route", keywords: ["approve"] },
  { id: "recovery", label: "Recovery Workflows", href: "/revenue/recovery", icon: RefreshCw, kind: "route" },
  { id: "experiments", label: "Revenue Experiments", href: "/revenue/experiments", icon: FlaskConical, kind: "route", keywords: ["ab", "lift"] },
  { id: "customers", label: "Customers", href: "/customers", icon: Users, kind: "route" },
  { id: "payments", label: "Payments", href: "/payments", icon: CreditCard, kind: "route" },
  { id: "subscriptions", label: "Subscriptions", href: "/subscriptions", icon: RefreshCw, kind: "route" },
  { id: "copilot", label: "AI Copilot", href: "/copilot", icon: Sparkles, kind: "route", keywords: ["ask", "ai"] },
  { id: "automation", label: "Automation", href: "/automation", icon: Zap, kind: "route" },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3, kind: "route" },
  { id: "risk", label: "Risk", href: "/risk", icon: ShieldAlert, kind: "route" },
  { id: "audit", label: "Audit Trail", href: "/audit", icon: FileText, kind: "route" },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings, kind: "route" },
];

const RECENT_KEY = "paypilot-cmdk-recent";

function score(query: string, item: PaletteItem): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const hay = [item.label, item.hint ?? "", ...(item.keywords ?? [])].join(" ").toLowerCase();
  if (hay.startsWith(q)) return 100;
  if (hay.includes(q)) return 70;
  // crude fuzzy: all chars in order
  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return 40;
  }
  return -1;
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setRecent(readRecent());
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const items = useMemo(() => {
    const actions: PaletteItem[] = [
      {
        id: "action-approve-auto",
        label: "Approve all auto-tier recoveries",
        href: "/revenue/opportunities",
        hint: "Jump to opportunities",
        icon: Zap,
        kind: "action",
        keywords: ["approve", "auto"],
      },
      {
        id: "action-new-experiment",
        label: "New experiment",
        href: "/revenue/experiments",
        hint: "Start a lift test",
        icon: FlaskConical,
        kind: "action",
      },
    ];

    const q = query.trim();
    if (q && !ROUTES.some((r) => score(q, r) >= 0) && !actions.some((a) => score(q, a) >= 0)) {
      actions.unshift({
        id: "ask-copilot",
        label: `Ask copilot: ${q}`,
        href: `/copilot?q=${encodeURIComponent(q)}`,
        hint: "Open AI Copilot with this query",
        icon: Sparkles,
        kind: "action",
        keywords: ["ask"],
      });
    }

    const pool = [...ROUTES, ...actions];
    if (!q) {
      const recentItems = recent
        .map((id) => pool.find((p) => p.id === id))
        .filter(Boolean) as PaletteItem[];
      const rest = pool.filter((p) => !recent.includes(p.id));
      return [...recentItems, ...rest];
    }

    return pool
      .map((item) => ({ item, s: score(q, item) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.item);
  }, [query, recent]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function run(item: PaletteItem) {
    pushRecent(item.id);
    onOpenChange(false);
    if (item.href) router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      run(items[active]);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[18vh]">
          <motion.button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 bg-base-0/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={ease}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-base-border bg-base-100 shadow-card"
            initial={reduced ? fadeOpacity.initial : paletteMotion.initial}
            animate={reduced ? fadeOpacity.animate : paletteMotion.animate}
            exit={reduced ? fadeOpacity.exit : paletteMotion.exit}
            transition={ease}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-base-border px-4 py-3">
              <Search size={16} className="text-ink-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages and actions…"
                className="w-full bg-transparent text-sm text-ink-0 outline-none placeholder:text-ink-500"
              />
              <kbd className="rounded border border-base-border bg-base-200 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
                esc
              </kbd>
            </div>
            <div className="max-h-[min(56vh,22rem)] overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-300">No matches</p>
              ) : (
                items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => run(item)}
                      onMouseEnter={() => setActive(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        index === active ? "bg-base-200 text-ink-0" : "text-ink-300 hover:bg-base-50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border border-base-border bg-base-50",
                          item.kind === "action" && item.id === "ask-copilot" && "border-violet-500/30 text-violet-400",
                          item.href === "/copilot" && "text-violet-400"
                        )}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{item.label}</span>
                        {item.hint ? <span className="block truncate text-xs text-ink-500">{item.hint}</span> : null}
                      </span>
                      {item.kind === "route" ? (
                        <span className="font-mono text-[10px] text-ink-500">{item.href}</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide text-ink-500">Action</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

const fadeOpacity = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

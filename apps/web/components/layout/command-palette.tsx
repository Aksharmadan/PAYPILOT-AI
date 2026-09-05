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
  Activity,
  ArrowRight,
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
  meta?: string;
  group?: string;
};

const ROUTES: PaletteItem[] = [
  { id: "home",         label: "Command Center",       href: "/command-center",        icon: LayoutGrid,  kind: "route", group: "Operate" },
  { id: "opportunities",label: "Opportunities",        href: "/revenue/opportunities", icon: TrendingUp,  kind: "route", group: "Operate", keywords: ["approve", "recover"] },
  { id: "recovery",     label: "Recovery",             href: "/revenue/recovery",      icon: Activity,    kind: "route", group: "Operate" },
  { id: "customers",    label: "Customers",            href: "/customers",             icon: Users,       kind: "route", group: "Operate" },
  { id: "payments",     label: "Payments",             href: "/payments",              icon: CreditCard,  kind: "route", group: "Operate" },
  { id: "subscriptions",label: "Subscriptions",        href: "/subscriptions",         icon: RefreshCw,   kind: "route", group: "Operate" },
  { id: "copilot",      label: "AI Analyst",           href: "/copilot",               icon: Sparkles,    kind: "route", group: "Intelligence", keywords: ["ask", "ai", "chat"] },
  { id: "risk",         label: "Risk Scoring",         href: "/risk",                  icon: ShieldAlert, kind: "route", group: "Intelligence" },
  { id: "churn",        label: "Churn Radar",          href: "/risk/churn",            icon: Activity,    kind: "route", group: "Intelligence" },
  { id: "renewal",      label: "Renewal Radar",        href: "/risk/renewal",          icon: RefreshCw,   kind: "route", group: "Intelligence" },
  { id: "experiments",  label: "Experiments",          href: "/revenue/experiments",   icon: FlaskConical,kind: "route", group: "Intelligence", keywords: ["ab", "lift", "test"] },
  { id: "automation",   label: "Automation",           href: "/automation",            icon: Zap,         kind: "route", group: "System" },
  { id: "analytics",    label: "Business Impact",      href: "/analytics",             icon: BarChart3,   kind: "route", group: "System" },
  { id: "audit",        label: "Audit Trail",          href: "/audit",                 icon: FileText,    kind: "route", group: "System" },
  { id: "settings",     label: "Settings",             href: "/settings",              icon: Settings,    kind: "route", group: "System" },
];

const ACTIONS: PaletteItem[] = [
  { id: "action-approve", label: "Approve auto-tier recoveries", href: "/revenue/opportunities", hint: "Jump to opportunities", icon: Zap,         kind: "action", keywords: ["approve", "auto"] },
  { id: "action-exp",     label: "New experiment",               href: "/revenue/experiments",   hint: "Start an A/B lift test", icon: FlaskConical, kind: "action" },
];

const RECENT_KEY = "paypilot-cmdk-recent";
const readRecent  = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; } };
const pushRecent  = (id: string)  => localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter(x => x !== id)].slice(0, 6)));

function score(query: string, item: PaletteItem): number {
  const q   = query.trim().toLowerCase();
  if (!q) return 0;
  const hay = [item.label, item.hint ?? "", ...(item.keywords ?? [])].join(" ").toLowerCase();
  if (hay.startsWith(q))  return 100;
  if (hay.includes(q))    return 70;
  let i = 0;
  for (const ch of hay) { if (ch === q[i]) i++; if (i === q.length) return 40; }
  return -1;
}

const iconColors: Record<string, string> = {
  copilot: "text-violet-400 bg-violet-500/15 border-violet-500/25",
  risk: "text-coral-400 bg-coral-500/10 border-coral-500/20",
  churn: "text-coral-400 bg-coral-500/10 border-coral-500/20",
  opportunities: "text-jade-400 bg-jade-500/10 border-jade-500/20",
  recovery: "text-jade-400 bg-jade-500/10 border-jade-500/20",
  automation: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router    = useRouter();
  const [query,  setQuery]    = useState("");
  const [active, setActive]   = useState(0);
  const [recent, setRecent]   = useState<string[]>([]);
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [searching, setSearching]   = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const reduced   = useReducedMotion();

  /* Live backend search */
  useEffect(() => {
    if (!query.trim()) { setApiResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setApiResults((await res.json()).items ?? []);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

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
      const isK = e.key === "k" || e.key === "K";
      if ((e.metaKey || e.ctrlKey) && isK) { e.preventDefault(); onOpenChange(!open); }
      if (e.key === "Escape" && open) { e.preventDefault(); onOpenChange(false); }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onOpenChange]);

  const items = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const pool = [...ROUTES, ...ACTIONS];
      const recentItems = recent.map(id => pool.find(p => p.id === id)).filter(Boolean) as PaletteItem[];
      const rest        = pool.filter(p => !recent.includes(p.id));
      return [...recentItems, ...rest];
    }
    const localMatches = [...ROUTES, ...ACTIONS]
      .map(item => ({ item, s: score(q, item) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.item);

    const apiItems: PaletteItem[] = apiResults.map(hit => ({
      id:    hit.id,
      label: hit.title,
      href:  `?drawerType=${hit.type}&drawerId=${hit.id}`,
      hint:  hit.subtitle ?? `Type: ${hit.type}`,
      icon:  hit.type === "customer" ? Users : hit.type === "payment" ? CreditCard : TrendingUp,
      kind:  "route" as const,
      meta:  hit.meta,
    }));

    const askAction: PaletteItem = {
      id: "ask-copilot", label: `Ask AI: "${q}"`,
      href: `/copilot?q=${encodeURIComponent(q)}`,
      hint: "Open Revenue Analyst with this question",
      icon: Sparkles, kind: "action",
    };

    return [...apiItems, ...localMatches, askAction];
  }, [query, recent, apiResults]);

  useEffect(() => { setActive(0); }, [query]);

  function run(item: PaletteItem) {
    pushRecent(item.id);
    onOpenChange(false);
    if (item.href) router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && items[active]) { e.preventDefault(); run(items[active]); }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[15vh]">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={ease}
            onClick={() => onOpenChange(false)}
          />

          {/* Palette panel */}
          <motion.div
            role="dialog" aria-modal aria-label="Command palette"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl glass-modal"
            initial={reduced ? { opacity: 0 } : paletteMotion.initial}
            animate={reduced ? { opacity: 1 } : paletteMotion.animate}
            exit={reduced   ? { opacity: 0 } : paletteMotion.exit}
            transition={ease}
            onKeyDown={onKeyDown}
          >
            {/* Search bar */}
            <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3.5">
              <Search size={15} className="text-ink-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages, customers, payments…"
                className="flex-1 bg-transparent text-sm text-ink-0 outline-none placeholder:text-ink-500"
                aria-label="Search"
              />
              {searching && (
                <span className="h-4 w-4 rounded-full border-2 border-violet-500/60 border-t-transparent animate-spin shrink-0" />
              )}
              <kbd className="rounded-lg border border-white/8 bg-white/5 px-1.5 py-0.5 font-mono text-2xs text-ink-500 shrink-0">
                esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[min(55vh,20rem)] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-500">No results</p>
              ) : (
                <div className="p-2 space-y-0.5">
                  {items.map((item, idx) => {
                    const Icon    = item.icon;
                    const isAI    = item.id === "ask-copilot" || item.href === "/copilot";
                    const iconCls = iconColors[item.id] ?? (isAI ? "text-violet-400 bg-violet-500/15 border-violet-500/25" : "text-ink-400 bg-base-200 border-base-border");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => run(item)}
                        onMouseEnter={() => setActive(idx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-80",
                          idx === active
                            ? "bg-white/6 text-ink-0"
                            : "text-ink-300 hover:bg-white/3"
                        )}
                      >
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl border shrink-0", iconCls)}>
                          <Icon size={14} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-xs font-medium">{item.label}</span>
                          {item.hint && (
                            <span className="block truncate text-2xs text-ink-500 mt-0.5">{item.hint}</span>
                          )}
                        </span>
                        {item.meta ? (
                          <span className="font-mono text-xs text-jade-300 font-semibold shrink-0">{item.meta}</span>
                        ) : idx === active ? (
                          <ArrowRight size={13} className="text-ink-500 shrink-0" />
                        ) : item.kind === "route" && item.group ? (
                          <span className="text-2xs text-ink-500 font-mono shrink-0 hidden sm:block">{item.group}</span>
                        ) : item.kind === "action" ? (
                          <span className="badge-violet text-2xs font-mono px-1.5 py-0.5 rounded-md shrink-0">Action</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-2">
              <span className="text-2xs text-ink-500 font-mono">↑↓ navigate · ↵ open · esc dismiss</span>
              <span className="text-2xs text-ink-500 font-mono flex items-center gap-1">
                <Sparkles size={10} className="text-violet-400" />
                PayPilot
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const fadeOpacity = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

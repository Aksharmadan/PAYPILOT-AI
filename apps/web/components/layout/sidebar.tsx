"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { LogoLockup } from "@/components/layout/logo";
import {
  LayoutGrid, TrendingUp, Users, CreditCard, RefreshCw,
  Sparkles, Zap, BarChart3, ShieldAlert, FileText, Settings,
  Play, FlaskConical, Activity, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Nav structure ─────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  accent?: boolean;
}
interface NavGroup {
  group: string;
  items: Array<NavItem | { label: string; icon: React.ElementType; children: NavItem[] }>;
}

const NAV: NavGroup[] = [
  {
    group: "OPERATE",
    items: [
      { label: "Command Center",  href: "/",                      icon: LayoutGrid },
      { label: "Opportunities",   href: "/revenue/opportunities", icon: TrendingUp },
      { label: "Recovery",        href: "/revenue/recovery",      icon: Activity   },
      { label: "Customers",       href: "/customers",             icon: Users      },
      { label: "Payments",        href: "/payments",              icon: CreditCard },
      { label: "Subscriptions",   href: "/subscriptions",         icon: RefreshCw  },
    ],
  },
  {
    group: "INTELLIGENCE",
    items: [
      {
        label: "Risk & Retention",
        icon: ShieldAlert,
        children: [
          { label: "Risk Scoring",  href: "/risk",         icon: ShieldAlert },
          { label: "Churn Radar",   href: "/risk/churn",   icon: Activity    },
          { label: "Renewal Radar", href: "/risk/renewal", icon: RefreshCw   },
        ],
      },
      { label: "AI Analyst",  href: "/copilot",             icon: Sparkles,    accent: true },
      { label: "Experiments", href: "/revenue/experiments", icon: FlaskConical },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Automation",      href: "/automation", icon: Zap       },
      { label: "Business Impact", href: "/analytics",  icon: BarChart3 },
      { label: "Audit Trail",     href: "/audit",      icon: FileText  },
    ],
  },
];

/* ── Route match helper ────────────────────────────────── */
function matchHref(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/* ── Collapsible child group ───────────────────────────── */
function NavGroupCollapse({
  item, pathname, pending, navigate,
}: {
  item: { label: string; icon: React.ElementType; children: NavItem[] };
  pathname: string;
  pending: boolean;
  navigate: (href: string) => void;
}) {
  const anyActive = item.children.some(c => matchHref(c.href, pathname));
  const [open, setOpen] = useState(anyActive);
  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-160",
          anyActive ? "text-violet-300 bg-violet-500/8" : "text-ink-500 hover:text-ink-300 hover:bg-base-200/60"
        )}
      >
        <Icon size={15} className={anyActive ? "text-violet-400" : "text-ink-500"} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={12} className={cn(
          "shrink-0 transition-transform duration-240",
          open ? "rotate-0 text-ink-400" : "-rotate-90 text-ink-500"
        )} />
      </button>

      {open && (
        <div className="mt-1 ml-4 pl-3 border-l border-base-border/50 space-y-0.5">
          {item.children.map(child => {
            const active = matchHref(child.href, pathname);
            return (
              <button
                key={child.href}
                type="button"
                onClick={() => navigate(child.href)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors duration-160",
                  active
                    ? "text-violet-300 font-semibold bg-violet-500/10"
                    : "text-ink-500 hover:text-ink-300 hover:bg-base-200/50"
                )}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
                {child.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main sidebar ──────────────────────────────────────── */
export function Sidebar() {
  const pathname           = usePathname();
  const router             = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistic href — lights up the destination immediately on click
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  function navigate(href: string) {
    if (href === pathname) return;
    setOptimisticHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  // The "active" href for styling: prefer optimistic (instant) over actual pathname
  function isNavActive(href: string) {
    const current = optimisticHref ?? pathname;
    return matchHref(href, current);
  }

  // Clear optimistic state once navigation completes
  // (usePathname updates when the new page is ready)
  if (optimisticHref && pathname !== optimisticHref && matchHref(optimisticHref, pathname)) {
    setOptimisticHref(null);
  }

  return (
    <aside
      className="relative z-20 w-56 shrink-0 h-full flex flex-col border-r border-base-border/80 bg-base-0"
      style={{ boxShadow: "inset -1px 0 0 hsl(var(--base-border) / 0.5)" }}
    >
      {/* ── Logo ─────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center px-4 border-b border-base-border/60">
        <LogoLockup iconSize={32} showDot={true} tagline="Revenue Engine" />
      </div>

      {/* ── Loading bar — appears during page fetch ── */}
      <div
        aria-hidden
        className={cn(
          "absolute top-14 left-0 right-0 h-0.5 origin-left transition-all duration-700 ease-out",
          isPending
            ? "bg-gradient-to-r from-violet-500 via-violet-400 to-transparent opacity-100 scale-x-100"
            : "opacity-0 scale-x-0"
        )}
        style={{ transform: isPending ? "scaleX(0.85)" : "scaleX(0)" }}
      />

      {/* ── Navigation ───────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Primary navigation">
        {NAV.map(sec => (
          <div key={sec.group}>
            <div className="px-3 pb-1.5 text-2xs font-bold uppercase tracking-widest text-ink-500/70">
              {sec.group}
            </div>

            <div className="space-y-0.5">
              {sec.items.map(item => {
                /* Collapsible group */
                if ("children" in item) {
                  return (
                    <NavGroupCollapse
                      key={item.label}
                      item={item}
                      pathname={optimisticHref ?? pathname}
                      pending={isPending}
                      navigate={navigate}
                    />
                  );
                }

                const active   = isNavActive(item.href);
                const isAccent = "accent" in item && item.accent;
                const Icon     = item.icon;

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-120",
                      active
                        ? "bg-violet-500/12 text-white border border-violet-500/20"
                        : isAccent
                        ? "text-violet-400 hover:text-violet-300 hover:bg-violet-500/8"
                        : "text-ink-400 hover:text-ink-100 hover:bg-base-200/50"
                    )}
                  >
                    <Icon
                      size={15}
                      className={cn(
                        "shrink-0 transition-colors",
                        active    ? "text-violet-400"
                        : isAccent ? "text-violet-400"
                        : "text-ink-500 group-hover:text-ink-300"
                      )}
                    />
                    <span className="flex-1 truncate text-left">{item.label}</span>

                    {/* Active dot */}
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0 shadow-[0_0_6px_rgba(124,111,240,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ───────────────────────── */}
      <div className="shrink-0 p-2 border-t border-base-border/60 space-y-0.5">
        <button
          type="button"
          onClick={() => navigate("/demo")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
            isNavActive("/demo")
              ? "bg-amber-500/12 text-amber-300 border border-amber-500/20"
              : "text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/8"
          )}
        >
          <Play size={13} className="shrink-0" />
          Demo Mode
        </button>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-ink-500 hover:text-ink-300 hover:bg-base-200/50 transition-colors"
        >
          <Settings size={13} className="shrink-0" />
          Settings
        </button>
      </div>
    </aside>
  );
}

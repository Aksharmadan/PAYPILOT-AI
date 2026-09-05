"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/components/layout/logo";
import {
  LayoutGrid,
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  Sparkles,
  Zap,
  BarChart3,
  ShieldAlert,
  FileText,
  Settings,
  Play,
  FlaskConical,
  Activity,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

/* ── Nav structure ─────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  accent?: boolean;
  badge?: string;
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
      { label: "AI Analyst",   href: "/copilot",              icon: Sparkles,    accent: true },
      { label: "Experiments",  href: "/revenue/experiments",  icon: FlaskConical },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Automation",       href: "/automation", icon: Zap       },
      { label: "Business Impact",  href: "/analytics",  icon: BarChart3 },
      { label: "Audit Trail",      href: "/audit",      icon: FileText  },
    ],
  },
];

/* ── Helpers ───────────────────────────────────────────── */
function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/* ── Collapsible group ─────────────────────────────────── */
function NavGroupCollapse({
  item,
  pathname,
}: {
  item: { label: string; icon: React.ElementType; children: NavItem[] };
  pathname: string;
}) {
  const anyActive = item.children.some(c => isActive(c.href, pathname));
  const [open, setOpen] = useState(anyActive);
  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-160",
          anyActive
            ? "text-violet-300 bg-violet-500/8"
            : "text-ink-500 hover:text-ink-300 hover:bg-base-200/60"
        )}
      >
        <Icon size={15} className={anyActive ? "text-violet-400" : "text-ink-500"} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={12}
          className={cn(
            "shrink-0 transition-transform duration-240",
            open ? "rotate-0 text-ink-400" : "-rotate-90 text-ink-500"
          )}
        />
      </button>

      {open && (
        <div className="mt-1 ml-4 pl-3 border-l border-base-border/50 space-y-0.5">
          {item.children.map(child => {
            const active = isActive(child.href, pathname);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-160",
                  active
                    ? "text-violet-300 font-semibold bg-violet-500/10"
                    : "text-ink-500 hover:text-ink-300 hover:bg-base-200/50"
                )}
              >
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                )}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main sidebar ──────────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="relative z-20 w-56 shrink-0 h-full flex flex-col border-r border-base-border/80 bg-base-0"
      style={{ boxShadow: "inset -1px 0 0 hsl(var(--base-border) / 0.5)" }}
    >
      {/* ── Logo ─────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center px-4 border-b border-base-border/60">
        <LogoLockup iconSize={32} showDot={true} tagline="Revenue Engine" />
      </div>

      {/* ── Navigation ───────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Primary navigation">
        {NAV.map(sec => (
          <div key={sec.group}>
            {/* Group label */}
            <div className="px-3 pb-1.5 text-2xs font-bold uppercase tracking-widest text-ink-500/70">
              {sec.group}
            </div>

            <div className="space-y-0.5">
              {sec.items.map(item => {
                /* Collapsible group */
                if ("children" in item) {
                  return (
                    <NavGroupCollapse key={item.label} item={item} pathname={pathname} />
                  );
                }

                const active   = isActive(item.href, pathname);
                const isAccent = "accent" in item && item.accent;
                const Icon     = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-160",
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
                        active   ? "text-violet-400"
                        : isAccent ? "text-violet-400"
                        : "text-ink-500 group-hover:text-ink-300"
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>

                    {/* Active indicator pill */}
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0
                        shadow-[0_0_6px_rgba(124,111,240,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ───────────────────────── */}
      <div className="shrink-0 p-2 border-t border-base-border/60 space-y-0.5">
        <Link
          href="/demo"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
            pathname === "/demo"
              ? "bg-amber-500/12 text-amber-300 border border-amber-500/20"
              : "text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/8"
          )}
        >
          <Play size={13} className="shrink-0" />
          Demo Mode
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-ink-500 hover:text-ink-300 hover:bg-base-200/50 transition-all"
        >
          <Settings size={13} className="shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

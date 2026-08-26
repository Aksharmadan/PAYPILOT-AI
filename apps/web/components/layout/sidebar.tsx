"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Command Center", href: "/", icon: LayoutGrid },
  {
    label: "Revenue",
    icon: TrendingUp,
    children: [
      { label: "Opportunities", href: "/revenue/opportunities" },
      { label: "Recovery", href: "/revenue/recovery" },
      { label: "Experiments", href: "/revenue/experiments" },
    ],
  },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Subscriptions", href: "/subscriptions", icon: RefreshCw },
  { label: "AI Copilot", href: "/copilot", icon: Sparkles, accent: true },
  { label: "Automation", href: "/automation", icon: Zap },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Risk", href: "/risk", icon: ShieldAlert },
  { label: "Audit", href: "/audit", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-10 w-64 shrink-0 border-r border-base-border bg-base-0/95 h-screen sticky top-0 flex flex-col backdrop-blur-xl">
      <div className="px-5 h-16 flex items-center gap-2 border-b border-base-border">
        <div className="h-6 w-6 rounded-md bg-jade-500 flex items-center justify-center">
          <span className="text-[11px] font-bold text-base-0">P</span>
        </div>
        <span className="font-semibold tracking-tight text-ink-0">PayPilot</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {nav.map((item) => {
          if (item.children) {
            return (
              <div key={item.label} className="mb-1">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                  <item.icon size={14} />
                  {item.label}
                </div>
                <div className="ml-6 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block px-3 py-1.5 rounded-lg text-sm text-ink-300 hover:text-ink-0 hover:bg-base-200 transition-colors",
                        pathname === child.href && "bg-base-200 text-ink-0"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          }

          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-300 transition hover:-translate-y-0.5 hover:text-ink-0 hover:bg-base-200",
                active && "bg-base-200 text-ink-0 shadow-card",
                item.accent && "text-violet-400 hover:text-violet-400"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-base-border">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-300 hover:text-ink-0 hover:bg-base-200 transition-colors"
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>
    </aside>
  );
}

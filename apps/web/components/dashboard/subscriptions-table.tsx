"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw } from "lucide-react";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import type { Subscription } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type SortKey = "mrr" | "current_period_end" | "status" | "plan_name";

export function SubscriptionsTable({ subscriptions }: { subscriptions: Subscription[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("mrr");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const sorted = [...subscriptions].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return asc ? sorted : sorted.reverse();
  }, [subscriptions, sortKey, asc]);

  function toggle(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "plan_name" || key === "status");
    }
  }

  if (subscriptions.length === 0) {
    return (
      <div className="table-shell rounded-2xl">
        <EmptyState
          icon={<RefreshCw size={18} />}
          title="No subscriptions"
          description="Active and past-due plans will land here after subscription sync."
        />
      </div>
    );
  }

  return (
    <div className="table-shell overflow-hidden rounded-2xl">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-base-100/95 backdrop-blur">
            <tr className="border-b border-base-border text-left text-ink-300">
              <SortTh label="Plan" active={sortKey === "plan_name"} asc={asc} onClick={() => toggle("plan_name")} />
              <SortTh label="Status" active={sortKey === "status"} asc={asc} onClick={() => toggle("status")} />
              <SortTh label="MRR" active={sortKey === "mrr"} asc={asc} align="right" onClick={() => toggle("mrr")} />
              <SortTh
                label="Renews"
                active={sortKey === "current_period_end"}
                asc={asc}
                align="right"
                onClick={() => toggle("current_period_end")}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => router.push(`?drawerType=subscription&drawerId=${s.id}`)}
                className={cn(
                  "table-row border-b border-base-border last:border-0 cursor-pointer",
                  s.status === "past_due" && "hover:shadow-[0_0_24px_rgba(240,85,76,0.06)]"
                )}
              >
                <td className="px-5 py-3 text-ink-0">{s.plan_name}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-0">{formatINR(s.mrr)}</td>
                <td className="px-5 py-3 text-right text-xs text-ink-300">
                  {new Date(s.current_period_end).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortTh({
  label,
  active,
  asc,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Icon = !active ? ArrowUpDown : asc ? ArrowUp : ArrowDown;
  return (
    <th className={cn("px-5 py-3 font-medium", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 transition hover:text-ink-0",
          active ? "text-ink-0" : "text-ink-300",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <Icon size={12} />
      </button>
    </th>
  );
}

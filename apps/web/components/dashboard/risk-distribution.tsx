"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ShieldAlert } from "lucide-react";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import type { RiskItem } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "bg-jade-500",
  medium: "bg-amber-500",
  low: "bg-coral-500",
};

export function RiskSummaryBar({
  high,
  medium,
  low,
}: {
  high: number;
  medium: number;
  low: number;
}) {
  const total = high + medium + low || 1;
  const segments = [
    { key: "high", label: "High Confidence", amount: high },
    { key: "medium", label: "Medium Confidence", amount: medium },
    { key: "low", label: "Low Confidence", amount: low },
  ];

  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="mb-4 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${CONFIDENCE_COLOR[s.key]} transition-all duration-700`}
            style={{ width: `${(s.amount / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {segments.map((s) => (
          <div key={s.key}>
            <div className="mb-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${CONFIDENCE_COLOR[s.key]}`} />
              <span className="text-sm text-ink-300">{s.label}</span>
            </div>
            <div className="font-mono text-lg font-semibold tabular-nums text-ink-0">
              {formatINR(s.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SortKey = "amount" | "recoverability_score" | "confidence" | "type";

export function RiskItemsTable({ items }: { items: RiskItem[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("recoverability_score");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return asc ? sorted : sorted.reverse();
  }, [items, sortKey, asc]);

  function toggle(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="table-shell rounded-2xl">
        <EmptyState
          icon={<ShieldAlert size={18} />}
          title="No scored opportunities"
          description="Risk scoring appears once failed payments, abandoned checkouts, or past-due subscriptions enter the queue."
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
              <SortTh label="Type" active={sortKey === "type"} asc={asc} onClick={() => toggle("type")} />
              <SortTh label="Amount" active={sortKey === "amount"} asc={asc} align="right" onClick={() => toggle("amount")} />
              <SortTh label="Confidence" active={sortKey === "confidence"} asc={asc} onClick={() => toggle("confidence")} />
              <SortTh
                label="Score"
                active={sortKey === "recoverability_score"}
                asc={asc}
                align="right"
                onClick={() => toggle("recoverability_score")}
              />
              <th className="px-5 py-3 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr
                key={i.id}
                className={cn(
                  "table-row border-b border-base-border last:border-0",
                  i.confidence === "high" && "hover:shadow-[0_0_24px_rgba(34,192,138,0.07)]",
                  i.confidence === "low" && "hover:shadow-[0_0_24px_rgba(240,85,76,0.07)]"
                )}
              >
                <td className="px-5 py-3 capitalize text-ink-100">{i.type}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-0">{formatINR(i.amount)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={i.confidence} />
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-100">
                  {i.recoverability_score.toFixed(3)}
                </td>
                <td className="px-5 py-3 text-xs text-ink-300">{i.reason}</td>
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

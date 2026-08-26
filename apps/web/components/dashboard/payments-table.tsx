"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, CreditCard } from "lucide-react";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import type { Payment } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type SortKey = "amount" | "created_at" | "retry_count" | "status";

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const sorted = [...payments].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return asc ? sorted : sorted.reverse();
  }, [payments, sortKey, asc]);

  function toggle(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  if (payments.length === 0) {
    return (
      <div className="table-shell rounded-2xl">
        <EmptyState
          icon={<CreditCard size={18} />}
          title="No payments in this window"
          description="Failed and successful charges will show here once the merchant ledger is synced."
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
              <SortTh label="Amount" active={sortKey === "amount"} asc={asc} onClick={() => toggle("amount")} />
              <SortTh label="Status" active={sortKey === "status"} asc={asc} onClick={() => toggle("status")} />
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Failure Reason</th>
              <SortTh
                label="Retries"
                active={sortKey === "retry_count"}
                asc={asc}
                align="right"
                onClick={() => toggle("retry_count")}
              />
              <SortTh
                label="Date"
                active={sortKey === "created_at"}
                asc={asc}
                align="right"
                onClick={() => toggle("created_at")}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className={cn(
                  "table-row border-b border-base-border last:border-0",
                  p.status === "failed" && "hover:shadow-[0_0_24px_rgba(240,85,76,0.06)]"
                )}
              >
                <td className="px-5 py-3 font-mono tabular-nums text-ink-0">{formatINR(p.amount)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-5 py-3 text-ink-100">{p.payment_method ?? "—"}</td>
                <td className="px-5 py-3 text-xs text-ink-300">{p.failure_reason ?? "—"}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-100">{p.retry_count}</td>
                <td className="px-5 py-3 text-right text-xs text-ink-300">
                  {new Date(p.created_at).toLocaleDateString()}
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

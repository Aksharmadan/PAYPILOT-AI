"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Users, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Customer } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type SortKey = "name" | "lifetime_value" | "churn_risk_score" | "segment";

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("lifetime_value");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const sorted = [...customers].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return asc ? sorted : sorted.reverse();
  }, [customers, sortKey, asc]);

  function toggle(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "name" || key === "segment");
    }
  }

  if (customers.length === 0) {
    return (
      <div className="table-shell rounded-2xl">
        <EmptyState
          icon={<Users size={18} />}
          title="No customers yet"
          description="Once merchants sync payment data, customer segments and lifetime value will appear here."
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
              <SortTh label="Customer" active={sortKey === "name"} asc={asc} onClick={() => toggle("name")} />
              <SortTh label="Segment" active={sortKey === "segment"} asc={asc} onClick={() => toggle("segment")} />
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Country</th>
              <SortTh
                label="Lifetime Value"
                active={sortKey === "lifetime_value"}
                asc={asc}
                align="right"
                onClick={() => toggle("lifetime_value")}
              />
              <SortTh
                label="Churn Risk"
                active={sortKey === "churn_risk_score"}
                asc={asc}
                align="right"
                onClick={() => toggle("churn_risk_score")}
              />
              <th className="px-5 py-3 font-medium text-right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className="table-row border-b border-base-border last:border-0 cursor-pointer group"
              >
                <td className="px-5 py-3">
                  <div className="text-ink-0 font-medium">{c.name}</div>
                  <div className="text-xs text-ink-300">{c.email}</div>
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-md border border-base-border bg-base-50 px-2 py-1 text-xs capitalize text-ink-100">
                    {(c.segment ?? "—").replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-100">{c.plan ?? "—"}</td>
                <td className="px-5 py-3 text-ink-100">{c.country ?? "—"}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-0">
                  {formatINR(c.lifetime_value)}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">
                  <span className={c.churn_risk_score > 0.6 ? "text-coral-400" : "text-ink-100"}>
                    {(c.churn_risk_score * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/customers/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 opacity-0 group-hover:opacity-100 hover:text-violet-300 transition-all"
                  >
                    360 View
                    <ArrowRight size={11} />
                  </Link>
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

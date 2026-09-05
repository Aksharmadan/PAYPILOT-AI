import Link from "next/link";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { PaymentsTable } from "@/components/dashboard/payments-table";
import { getPayments } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { CreditCard, XCircle, CheckCircle2, RefreshCw, TrendingDown } from "lucide-react";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ skip?: string; limit?: string; status?: string }>;
}) {
  const params = await searchParams;
  const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
  const skip = Math.max(Number(params.skip) || 0, 0);
  const { items, total } = await getPayments(limit, skip);

  // Compute intelligence metrics from the current page
  const failed = items.filter((p) => p.status === "failed");
  const succeeded = items.filter((p) => p.status === "succeeded");
  const refunded = items.filter((p) => p.status === "refunded");
  const failedAmount = failed.reduce((s, p) => s + p.amount, 0);
  const succeededAmount = succeeded.reduce((s, p) => s + p.amount, 0);
  const successRate = items.length > 0 ? (succeeded.length / items.length) * 100 : 0;
  const withRetries = failed.filter((p) => p.retry_count > 0).length;

  // Failure reason breakdown
  const reasonCounts: Record<string, number> = {};
  for (const p of failed) {
    if (p.failure_reason) {
      reasonCounts[p.failure_reason] = (reasonCounts[p.failure_reason] || 0) + 1;
    }
  }
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-enter">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink-500">Payment Intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-0">Payments</h1>
          <p className="mt-1 text-sm text-ink-400">{total.toLocaleString()} total payments in ledger</p>
        </div>
        <Link
          href="/revenue/opportunities?source=payment"
          className="inline-flex items-center gap-1.5 rounded-lg border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs font-medium text-jade-400 hover:bg-jade-500/15 transition"
        >
          <TrendingDown size={12} />
          View Recovery Queue
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        <div className="card-surface rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-jade-400" />
            <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">Success Rate</p>
          </div>
          <p className={`font-mono text-xl font-bold tabular-nums ${successRate >= 80 ? "text-jade-400" : successRate >= 60 ? "text-amber-400" : "text-coral-400"}`}>
            {successRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-ink-500">{succeeded.length} succeeded</p>
        </div>
        <div className="card-surface rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <XCircle size={12} className="text-coral-400" />
            <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">Failed</p>
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-coral-400">{failed.length}</p>
          <p className="text-[10px] text-ink-500">{formatINR(failedAmount)}</p>
        </div>
        <div className="card-surface rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <CreditCard size={12} className="text-jade-400" />
            <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">Revenue Processed</p>
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-jade-400">{formatINR(succeededAmount)}</p>
          <p className="text-[10px] text-ink-500">this page</p>
        </div>
        <div className="card-surface rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <RefreshCw size={12} className="text-amber-400" />
            <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">With Retries</p>
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-amber-400">{withRetries}</p>
          <p className="text-[10px] text-ink-500">failed payments</p>
        </div>
        <div className="card-surface rounded-xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">Top Failure</p>
          <p className="font-mono text-sm font-bold text-coral-300 capitalize">
            {topReasons[0]?.[0]?.replaceAll("_", " ") || "—"}
          </p>
          <p className="text-[10px] text-ink-500">
            {topReasons[0] ? `${topReasons[0][1]} occurrences` : "none"}
          </p>
        </div>
      </div>

      {/* Failure reason breakdown */}
      {topReasons.length > 0 && (
        <section className="card-surface rounded-xl p-4">
          <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide mb-3">Failure Reason Distribution (this page)</p>
          <div className="space-y-2">
            {topReasons.map(([reason, count]) => {
              const pct = failed.length > 0 ? (count / failed.length) * 100 : 0;
              return (
                <div key={reason} className="flex items-center gap-3">
                  <span className="w-36 text-xs text-ink-300 capitalize shrink-0">{reason.replaceAll("_", " ")}</span>
                  <div className="flex-1 h-2 rounded-full bg-base-200 overflow-hidden">
                    <div className="h-full rounded-full bg-coral-500/60" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] text-ink-400">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <PaymentsTable payments={items} />
      <PaginationControls basePath="/payments" skip={skip} limit={limit} total={total} />
    </div>
  );
}

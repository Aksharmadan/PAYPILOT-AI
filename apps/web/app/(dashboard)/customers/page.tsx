import Link from "next/link";
import { CustomersTable } from "@/components/dashboard/customers-table";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { getCustomers } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Users, TrendingUp, AlertTriangle, Sparkles, ChevronRight } from "lucide-react";

export default async function CustomersPage({
  searchParams,
}: { searchParams: Promise<{ skip?: string; limit?: string }> }) {
  const params = await searchParams;
  const limit  = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
  const skip   = Math.max(Number(params.skip) || 0, 0);

  const { items, total } = await getCustomers(limit, skip);

  const highChurn = items.filter(c => c.churn_risk_score >= 0.6);
  const withPlan  = items.filter(c => c.plan);
  const totalLTV  = items.reduce((s, c) => s + c.lifetime_value, 0);
  const avgLTV    = items.length > 0 ? totalLTV / items.length : 0;

  const segments: Record<string, number> = {};
  for (const c of items) {
    const seg = c.segment ?? "unknown";
    segments[seg] = (segments[seg] || 0) + 1;
  }
  const topSegments = Object.entries(segments).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const avgChurn = items.length > 0
    ? items.reduce((s, c) => s + c.churn_risk_score, 0) / items.length
    : 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Customer Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Customer 360</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            {total.toLocaleString()} customers — click any row to open the full profile
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/risk/churn"
            className="badge-coral inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-80">
            <AlertTriangle size={12}/> Churn Radar
          </Link>
          <Link href={`/copilot?q=${encodeURIComponent("Which customers are at highest risk of churn?")}`}
            className="badge-violet inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-80">
            <Sparkles size={12}/> Ask AI
          </Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-surface rounded-2xl p-5 space-y-1.5 card-interactive cursor-default">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-violet-400"/>
            <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">Total Customers</p>
          </div>
          <p className="font-mono text-2xl font-black text-ink-0">{total.toLocaleString()}</p>
          <p className="text-2xs text-ink-500">{withPlan.length} on paid plans (this page)</p>
        </div>

        <div className="card-surface rounded-2xl p-5 space-y-1.5 card-glow-jade card-interactive cursor-default">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-jade-400"/>
            <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">Avg. LTV</p>
          </div>
          <p className="font-mono text-2xl font-black stat-glow-jade">{formatINR(avgLTV)}</p>
          <p className="text-2xs text-ink-500">per customer (this page)</p>
        </div>

        <div className="card-surface rounded-2xl p-5 space-y-1.5 card-glow-coral card-interactive cursor-default">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-coral-400"/>
            <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">High Churn Risk</p>
          </div>
          <p className="font-mono text-2xl font-black stat-glow-coral">{highChurn.length}</p>
          <p className="text-2xs text-ink-500">churn probability ≥ 60%</p>
        </div>

        <div className="card-surface rounded-2xl p-5 space-y-2">
          <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">Segments</p>
          <div className="space-y-1.5">
            {topSegments.slice(0, 3).map(([seg, count]) => {
              const pct = Math.round((count / items.length) * 100);
              return (
                <div key={seg} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-2xs text-ink-400 capitalize">{seg.replaceAll("_", " ")}</span>
                    <span className="font-mono text-2xs text-ink-300 font-bold">{count}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-base-300/50 overflow-hidden">
                    <div className="h-full rounded-full progress-bar-violet" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Churn distribution insight ── */}
      {highChurn.length > 0 && (
        <div className="card-surface rounded-2xl border border-coral-500/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-coral-500/10 border border-coral-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-coral-400"/>
            </div>
            <div>
              <p className="text-sm font-bold text-ink-0">
                {highChurn.length} customers at high churn risk
              </p>
              <p className="text-xs text-ink-400">
                Avg churn score {(avgChurn * 100).toFixed(0)}% · Combined LTV {formatINR(highChurn.reduce((s,c) => s + c.lifetime_value, 0))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/risk/churn"
              className="badge-coral inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
              View Churn Radar <ChevronRight size={11}/>
            </Link>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <CustomersTable customers={items}/>
      <PaginationControls basePath="/customers" skip={skip} limit={limit} total={total}/>
    </div>
  );
}

import Link from "next/link";
import { RiskSummaryBar, RiskItemsTable } from "@/components/dashboard/risk-distribution";
import { getFailureAnomaly, getRiskDistribution } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { AlertTriangle, ShieldAlert, Target, TrendingDown, Sparkles } from "lucide-react";

export default async function RiskPage() {
  const [data, anomaly] = await Promise.all([getRiskDistribution(200), getFailureAnomaly()]);

  const totalAmount = data.high_confidence_amount + data.medium_confidence_amount + data.low_confidence_amount;
  const highPct  = totalAmount > 0 ? Math.round((data.high_confidence_amount  / totalAmount) * 100) : 0;
  const medPct   = totalAmount > 0 ? Math.round((data.medium_confidence_amount / totalAmount) * 100) : 0;
  const lowPct   = totalAmount > 0 ? Math.round((data.low_confidence_amount   / totalAmount) * 100) : 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Intelligence Engine</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Risk Scoring</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            {data.items.length} scored opportunities — ranked by recoverability confidence
          </p>
        </div>
        <Link href={`/copilot?q=${encodeURIComponent("Explain the current risk distribution and what to do about it")}`}
          className="badge-violet shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
          <Sparkles size={12}/> Ask AI
        </Link>
      </div>

      {/* ── Anomaly alert ── */}
      {anomaly.active && (
        <div className="rounded-2xl border border-coral-500/30 bg-coral-500/8 px-5 py-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-xl bg-coral-500/15 border border-coral-500/25 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={15} className="text-coral-400"/>
          </div>
          <div>
            <p className="text-sm font-bold text-coral-300">Failure-Rate Anomaly Detected</p>
            <p className="text-xs text-coral-400/80 mt-0.5 leading-relaxed">{anomaly.message}</p>
          </div>
        </div>
      )}

      {/* ── Distribution KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label:    "High Confidence",
            amount:   data.high_confidence_amount,
            pct:      highPct,
            cls:      "stat-glow-jade",
            barCls:   "progress-bar-jade",
            badgeCls: "badge-jade",
            icon:     Target,
            iconCls:  "text-jade-400",
            desc:     "Auto-retry eligible · strong recovery signals",
          },
          {
            label:    "Medium Confidence",
            amount:   data.medium_confidence_amount,
            pct:      medPct,
            cls:      "stat-glow-amber",
            barCls:   "progress-bar-amber",
            badgeCls: "badge-amber",
            icon:     ShieldAlert,
            iconCls:  "text-amber-400",
            desc:     "Approval recommended · mixed signals",
          },
          {
            label:    "Low Confidence",
            amount:   data.low_confidence_amount,
            pct:      lowPct,
            cls:      "stat-glow-coral",
            barCls:   "progress-bar-coral",
            badgeCls: "badge-coral",
            icon:     TrendingDown,
            iconCls:  "text-coral-400",
            desc:     "Review required · weak recovery probability",
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-surface rounded-2xl p-5 space-y-3 card-interactive cursor-default">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-base-200 border border-base-border flex items-center justify-center">
                    <Icon size={15} className={s.iconCls}/>
                  </div>
                  <p className="text-xs font-bold text-ink-100">{s.label}</p>
                </div>
                <span className={`${s.badgeCls} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>
                  {s.pct}%
                </span>
              </div>
              <p className={`font-mono text-2xl font-black ${s.cls}`}>{formatINR(s.amount)}</p>
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-base-300/50 overflow-hidden">
                  <div className={`h-full rounded-full ${s.barCls}`} style={{ width: `${s.pct}%` }}/>
                </div>
                <p className="text-2xs text-ink-500">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Visual distribution bar ── */}
      <section className="card-surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-0">Confidence Distribution</h2>
          <span className="text-2xs font-mono text-ink-500">{formatINR(totalAmount)} total at risk</span>
        </div>
        <RiskSummaryBar
          high={data.high_confidence_amount}
          medium={data.medium_confidence_amount}
          low={data.low_confidence_amount}
        />
        <div className="flex items-center gap-6 text-xs pt-1">
          {[
            { label: "High confidence",   color: "bg-jade-500", pct: highPct },
            { label: "Medium confidence", color: "bg-amber-500", pct: medPct },
            { label: "Low confidence",    color: "bg-coral-500", pct: lowPct },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${l.color}`}/>
              <span className="text-ink-400">{l.label}</span>
              <span className="font-mono text-ink-300 font-bold">{l.pct}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Explain section ── */}
      <div className="card-surface rounded-2xl border border-violet-500/15 p-5 space-y-3">
        <h3 className="text-sm font-bold text-ink-0 flex items-center gap-2">
          <ShieldAlert size={14} className="text-violet-400"/>
          Understanding Confidence Tiers
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          {[
            {
              tier: "HIGH",
              badge: "badge-jade",
              points: [
                "Recovery probability ≥ 70%",
                "Prior recovery success on account",
                "Active payment method on file",
                "Low churn risk score",
                "→ Auto-retry eligible",
              ],
            },
            {
              tier: "MEDIUM",
              badge: "badge-amber",
              points: [
                "Recovery probability 40–69%",
                "Mixed payment method signals",
                "Some retry history",
                "Moderate churn risk",
                "→ Manual approval recommended",
              ],
            },
            {
              tier: "LOW",
              badge: "badge-coral",
              points: [
                "Recovery probability < 40%",
                "Multiple prior retries failed",
                "Expired or missing payment method",
                "High churn risk score",
                "→ Human review required",
              ],
            },
          ].map(t => (
            <div key={t.tier} className="glass-card rounded-xl p-4 space-y-2">
              <span className={`${t.badge} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>{t.tier}</span>
              <ul className="space-y-1">
                {t.points.map(p => (
                  <li key={p} className={`text-2xs ${p.startsWith("→") ? "text-ink-300 font-semibold mt-1" : "text-ink-500"}`}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Items table ── */}
      <RiskItemsTable items={data.items}/>
    </div>
  );
}

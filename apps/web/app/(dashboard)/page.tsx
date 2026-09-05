import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  Sparkles,
  ArrowRight,
  Activity,
  Target,
  ShieldAlert,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { getDashboardSummary, getRevenueLeaks, getRevenueRecommendations, getRevenueRootCause } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { RiskGauge } from "@/components/dashboard/risk-gauge";
import { Stagger, StaggerItem } from "@/components/dashboard/stagger";
import { RootCauseAnalyzer } from "@/components/dashboard/root-cause-analyzer";
import { HeroRevenueSpark } from "@/components/dashboard/hero-revenue-spark";

/* ── Helper: confidence badge ───────────────────────────── */
function ConfBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    high:   "badge-jade",
    medium: "badge-amber",
    low:    "badge-neutral",
  };
  return (
    <span className={`${map[confidence] ?? "badge-neutral"} text-2xs font-mono font-bold px-2 py-0.5 rounded-md uppercase`}>
      {confidence}
    </span>
  );
}

/* ── Helper: small probability arc ─────────────────────── */
function ProbArc({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 1);
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = pct >= 0.7 ? "#34E8A0" : pct >= 0.4 ? "#FBC66B" : "#FF8177";
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--base-300))" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} />
    </svg>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default async function CommandCenterPage() {
  const [summary, leaks, recommendations, rootCause] = await Promise.all([
    getDashboardSummary(180),
    getRevenueLeaks(),
    getRevenueRecommendations(),
    getRevenueRootCause(30),
  ]);

  const recoveryRatePct = summary.recovery_rate ? (summary.recovery_rate * 100).toFixed(1) : "0.0";
  const isHealthy       = summary.revenue_health_score >= 70;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ════════════════════════════════════════
          BRIEFING HEADER
          ════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Revenue Command Center</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">
            What needs your attention.
          </h1>
          {summary.briefing?.headline && (
            <p className="text-sm text-ink-400 mt-1 max-w-xl">{summary.briefing.headline}</p>
          )}
        </div>
        <Link href="/copilot"
          className="btn-glow-violet hidden sm:inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
          <Sparkles size={13} />
          Ask AI Analyst
        </Link>
      </div>

      {/* ════════════════════════════════════════
          HERO GRID — Risk + Health + Spark
          ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">

        {/* ── Revenue at Risk hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-coral-500/25 bg-base-100 p-7 mesh-coral mesh-hero">
          <div aria-hidden className="pointer-events-none absolute -left-12 -top-12 h-72 w-72 rounded-full bg-coral-500/7 blur-[80px]" />
          <div aria-hidden className="pointer-events-none absolute right-8 bottom-0 h-52 w-52 rounded-full bg-violet-500/7 blur-[60px]" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-3">
              {/* Label */}
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-coral-500/10 border border-coral-500/20 flex items-center justify-center">
                  <AlertTriangle size={15} className="text-coral-400" />
                </div>
                <span className="badge-coral text-2xs font-mono font-bold px-2.5 py-1 rounded-lg">
                  REVENUE AT RISK
                </span>
              </div>

              {/* Big figure */}
              <div>
                <div className="font-mono text-5xl font-black tabular-nums stat-glow-coral leading-none">
                  {formatINR(summary.revenue_at_risk)}
                </div>
                <p className="text-sm text-ink-300 mt-2 max-w-sm leading-relaxed">
                  PayPilot has identified{" "}
                  <span className="font-semibold stat-glow-jade">
                    {formatINR(summary.high_confidence_recoverable)}
                  </span>{" "}
                  as high-confidence recoverable — ready for immediate action.
                </p>
              </div>

              {/* Source breakdown */}
              {summary.by_source?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {summary.by_source.slice(0, 3).map(s => (
                    <div key={s.source}
                      className="flex items-center gap-1.5 glass-card rounded-xl px-3 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-coral-400/70" />
                      <span className="text-2xs text-ink-400 capitalize">{s.source.replace("_", " ")}</span>
                      <span className="font-mono text-2xs font-bold text-coral-300">{formatINR(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2 sm:items-end shrink-0">
              <Link href="/revenue/opportunities"
                className="btn-glow-coral inline-flex items-center gap-2 rounded-xl bg-coral-500 px-5 py-2.5 text-sm font-bold text-white">
                Review Recovery Plan
                <ArrowRight size={14} />
              </Link>
              <Link href="/revenue/recovery"
                className="btn-ghost inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium">
                <Activity size={13} />
                Recovery Engine
              </Link>
            </div>
          </div>
        </div>

        {/* ── Revenue Health card ── */}
        <div className="rounded-2xl card-surface flex flex-col p-5 gap-4">
          <div className="flex items-center justify-between border-b border-base-border pb-3">
            <div>
              <p className="text-xs font-semibold text-ink-0">Health Index</p>
              <p className="text-2xs text-ink-500 font-mono mt-0.5">180d trailing</p>
            </div>
            <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-md ${isHealthy ? "badge-jade" : "badge-coral"}`}>
              {isHealthy ? "HEALTHY" : "AT RISK"}
            </span>
          </div>

          <div className="flex flex-col items-center py-2">
            <RiskGauge score={summary.revenue_health_score} />
            <p className={`text-xs font-medium mt-2 ${isHealthy ? "text-jade-400" : "text-amber-400"}`}>
              {summary.revenue_health_score >= 80
                ? "Optimal performance"
                : summary.revenue_health_score >= 60
                ? "Requires attention"
                : "Immediate action needed"}
            </p>
          </div>

          <div className="border-t border-base-border/60 pt-3">
            <p className="text-2xs text-ink-500 mb-1.5">Revenue trend</p>
            <HeroRevenueSpark className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          KPI SCORECARD
          ════════════════════════════════════════ */}
      <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label:      "Period Revenue",
            value:      summary.revenue_period,
            sub:        summary.revenue_delta_pct
                          ? `${summary.revenue_delta_pct > 0 ? "+" : ""}${summary.revenue_delta_pct.toFixed(1)}% vs prior`
                          : "—",
            valueClass: "text-ink-0",
            subColor:   summary.revenue_delta_pct && summary.revenue_delta_pct > 0 ? "text-jade-400" : "text-ink-500",
            isPercent:  false,
          },
          {
            label:      "Revenue at Risk",
            value:      summary.revenue_at_risk,
            sub:        `${summary.active_opportunities} active cases`,
            valueClass: "stat-glow-coral",
            subColor:   "text-coral-400/70",
            isPercent:  false,
          },
          {
            label:      "High-Conf. Recoverable",
            value:      summary.high_confidence_recoverable,
            sub:        "Auto-retry eligible",
            valueClass: "text-amber-400",
            subColor:   "text-amber-500/70",
            isPercent:  false,
          },
          {
            label:      "Recovered",
            value:      summary.recovered_period,
            sub:        "This period",
            valueClass: "stat-glow-jade",
            subColor:   "text-jade-400/70",
            isPercent:  false,
            glow:       true,
          },
          {
            label:      "Recovery Rate",
            value:      parseFloat(recoveryRatePct),
            isPercent:  true,
            sub:        "Intervention accuracy",
            valueClass: "stat-glow-violet",
            subColor:   "text-violet-400/70",
          },
        ].map(s => (
          <StaggerItem key={s.label}>
            <div className={`card-surface rounded-2xl p-4 space-y-1.5 transition-all ${s.glow ? "card-glow-jade" : "card-interactive"} cursor-default`}>
              <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider leading-none">{s.label}</p>
              <div className={`font-mono text-2xl font-black tabular-nums leading-none ${s.valueClass}`}>
                {s.isPercent ? (
                  <><AnimatedNumber value={s.value} /><span className="text-base font-normal opacity-70">%</span></>
                ) : (
                  <AnimatedNumber value={s.value} />
                )}
              </div>
              <p className={`text-2xs font-medium leading-none ${s.subColor}`}>{s.sub}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* ════════════════════════════════════════
          ATTENTION ITEMS
          ════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-coral-500 animate-pulse" />
            <h2 className="text-sm font-bold text-ink-0 tracking-tight">Priority Actions</h2>
            <span className="badge-coral text-2xs font-mono font-bold px-2 py-0.5 rounded-md">4 items</span>
          </div>
          <span className="text-2xs text-ink-500 font-mono">Sorted by ₹ impact × confidence</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              type:   "RECOVERY",
              color:  "border-l-jade-500",
              badge:  "badge-jade",
              icon:   Target,
              icolor: "text-jade-400",
              title:  "High-Confidence Recovery Ready",
              what:   `${summary.active_opportunities} failed payments with active cards and high algorithmic success probability.`,
              impact: `${formatINR(summary.high_confidence_recoverable)} available for immediate recovery.`,
              action: "Execute automated retry sequence via PayPilot recovery engine.",
              amount: formatINR(summary.high_confidence_recoverable),
              amtCls: "text-jade-300",
              links:  [
                { label: "Investigate",    href: "/revenue/opportunities",   style: "badge-jade" },
                { label: "Recover Now",    href: "/revenue/recovery",         style: "btn-glow-jade bg-jade-500 text-white" },
              ],
              ai:     "How should we recover the high confidence revenue?",
            },
            {
              type:   "ANOMALY",
              color:  "border-l-coral-500",
              badge:  "badge-coral",
              icon:   AlertTriangle,
              icolor: "text-coral-400",
              title:  "UPI Gateway Failure Spike",
              what:   "Bank NPCI rate limits triggered during peak hours — bank_timeout error code spiking.",
              impact: "Elevated checkout friction affecting 24 subscription renewals.",
              action: "Enable smart fallback routing to secondary PSP for UPI retries.",
              amount: "+31% spike",
              amtCls: "text-coral-300",
              links:  [
                { label: "View Payments",  href: "/payments",                style: "badge-coral" },
              ],
              ai:     "Analyze UPI failure spike causes and recommend gateway routing",
            },
            {
              type:   "RETENTION",
              color:  "border-l-amber-500",
              badge:  "badge-amber",
              icon:   ShieldAlert,
              icolor: "text-amber-400",
              title:  "High-Value Churn Exposure",
              what:   "Combined payment failure + reduced product activity score over past 14 days.",
              impact: "₹48.5K total MRR across 7 key accounts at risk of lapse.",
              action: "Trigger concierge dunning outreach with grace period extension.",
              amount: "7 accounts",
              amtCls: "text-amber-300",
              links:  [
                { label: "Churn Radar",    href: "/risk/churn",              style: "badge-amber" },
              ],
              ai:     "Which high value customers are at risk of churn this week?",
            },
            {
              type:   "RENEWAL",
              color:  "border-l-violet-500",
              badge:  "badge-violet",
              icon:   RefreshCw,
              icolor: "text-violet-400",
              title:  "Upcoming Expired Card Renewals",
              what:   "Card expiration or outdated mandate detected before upcoming charge date.",
              impact: "₹1.24L projected renewal revenue vulnerable over next 7 days.",
              action: "Dispatch pre-dunning card update request via automated link.",
              amount: "17 renewals",
              amtCls: "text-violet-300",
              links:  [
                { label: "Renewal Radar",  href: "/risk/renewal",            style: "badge-violet" },
              ],
              ai:     "Show renewal exposure for the next 7 days",
            },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.title}
                className={`card-surface rounded-2xl p-5 border-l-4 ${card.color} flex flex-col gap-4 card-interactive`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center bg-base-200 border border-base-border`}>
                      <Icon size={15} className={card.icolor} />
                    </div>
                    <div>
                      <span className={`${card.badge} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>{card.type}</span>
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-black ${card.amtCls} shrink-0`}>{card.amount}</span>
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-ink-0 leading-snug">{card.title}</h3>
                  <div className="space-y-1 text-xs text-ink-400">
                    <p><span className="font-semibold text-ink-300">What: </span>{card.what}</p>
                    <p><span className="font-semibold text-ink-300">Impact: </span>{card.impact}</p>
                    <p><span className="font-semibold text-ink-300">Action: </span>{card.action}</p>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-base-border/50">
                  {card.links.map(l => (
                    <Link key={l.label} href={l.href}
                      className={`${l.style} inline-flex items-center gap-1 text-2xs font-bold px-3 py-1.5 rounded-xl transition-all`}>
                      {l.label}
                    </Link>
                  ))}
                  <Link href={`/copilot?q=${encodeURIComponent(card.ai)}`}
                    className="ml-auto inline-flex items-center gap-1 text-2xs text-violet-400 hover:text-violet-300 transition-colors">
                    <Sparkles size={11} />
                    Ask AI
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════
          BOTTOM GRID — Root Cause + Opportunities + Recs
          ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

        {/* Left: Root Cause + AI Recommendations */}
        <div className="space-y-4">
          <RootCauseAnalyzer initialData={rootCause} />

          {/* AI Recommendations */}
          <section className="card-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                  <Sparkles size={13} className="text-violet-400" />
                </div>
                <h3 className="text-sm font-bold text-ink-0">PayPilot Recommends</h3>
              </div>
              <span className="badge-violet text-2xs font-mono font-bold px-2 py-0.5 rounded-md">AI-DRIVEN</span>
            </div>

            <div className="space-y-2.5">
              {recommendations.length > 0 ? recommendations.map((rec, i) => (
                <div key={rec.title}
                  className="group card-glow-violet card-interactive glass-card rounded-2xl p-4 transition-all cursor-default">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="h-6 w-6 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-2xs font-mono font-black text-violet-400 shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-0 truncate">{rec.title}</p>
                        <p className="text-xs text-ink-400 mt-0.5">
                          {rec.count} customers · {(rec.avg_probability * 100).toFixed(0)}% avg probability
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-black text-jade-300">{formatINR(rec.expected_recovery)}</p>
                      <p className="text-2xs text-ink-500 font-mono">exp. recovery</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-border/40">
                    <span className="badge-violet text-2xs font-mono px-2 py-0.5 rounded-md">
                      {(rec.avg_probability * 100).toFixed(0)}% confidence
                    </span>
                    <Link href="/revenue/opportunities"
                      className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors group-hover:gap-1.5">
                      Review <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center py-8 gap-2">
                  <CheckCircle2 size={24} className="text-jade-400" />
                  <p className="text-sm text-ink-300">No pending recovery recommendations.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Top Opportunities + Leaks */}
        <div className="space-y-4">

          {/* AI Analyst quick-access */}
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-base-100 p-5 space-y-3">
            <div aria-hidden className="absolute right-0 top-0 h-28 w-28 rounded-full bg-violet-500/7 blur-[40px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-violet-400" />
                <p className="text-xs font-bold text-ink-0">Revenue Analyst</p>
                <span className="badge-jade text-2xs font-mono font-bold px-1.5 py-0.5 rounded-md ml-auto">LIVE</span>
              </div>
              <p className="text-xs text-ink-400 leading-relaxed">
                Query your payment data, risk scores, and recovery outcomes in natural language.
              </p>
              <Link href="/copilot"
                className="flex items-center justify-between rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-300 hover:bg-violet-500/15 transition group mt-3">
                Open AI Analyst
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Top Opportunities */}
          <section className="card-surface rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-0 flex items-center gap-2">
                <TrendingUp size={14} className="text-jade-400" />
                Top Opportunities
              </h3>
              <Link href="/revenue/opportunities"
                className="text-2xs font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                View all <ChevronRight size={11} />
              </Link>
            </div>

            <div className="space-y-2">
              {summary.top_opportunities.length > 0 ? summary.top_opportunities.slice(0, 5).map(opp => (
                <Link key={opp.id} href={`?drawerType=opportunity&drawerId=${opp.id}`}
                  className="group flex items-center justify-between rounded-xl border border-base-border/60 bg-base-50/60 px-3.5 py-2.5 transition-all hover:border-jade-500/20 hover:bg-base-200/60 cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <ProbArc value={opp.recovery_probability} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-2xs font-black text-ink-0">{Math.round(opp.recovery_probability * 100)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-0 truncate leading-tight">{opp.title}</p>
                      <p className="text-2xs text-ink-500 capitalize mt-0.5">{opp.source.replace("_", " ")}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-mono text-xs font-black text-jade-300">{formatINR(opp.expected_recovery_value)}</p>
                    <ConfBadge confidence={opp.confidence} />
                  </div>
                </Link>
              )) : (
                <p className="text-center text-xs text-ink-500 py-4">No pending opportunities</p>
              )}
            </div>

            <Link href="/revenue/opportunities"
              className="btn-glow-jade flex items-center justify-center gap-2 w-full rounded-xl bg-jade-500 py-2.5 text-xs font-bold text-base-0">
              Full Recovery Plan
              <ArrowRight size={13} />
            </Link>
          </section>

          {/* Revenue leaks mini-panel */}
          {leaks.length > 0 && (
            <section className="card-surface rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-ink-0 flex items-center gap-2">
                <Zap size={14} className="text-coral-400" />
                Revenue Leaks
              </h3>
              <div className="space-y-2">
                {leaks.slice(0, 3).map(leak => (
                  <div key={leak.title}
                    className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-0 truncate leading-tight">{leak.title}</p>
                      <p className="text-2xs text-ink-500 mt-0.5 truncate">{leak.cause}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-black text-coral-300">−{formatINR(leak.impact_amount)}</p>
                      <span className={`text-2xs font-mono font-bold ${leak.confidence === "high" ? "text-coral-400" : "text-amber-400"}`}>
                        {leak.confidence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

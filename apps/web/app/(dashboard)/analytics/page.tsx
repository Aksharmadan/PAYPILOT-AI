import { apiFetch, getEvaluationSummary } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { ImpactBarChart, CalibrationChart } from "@/components/dashboard/analytics-charts";
import { TrendingUp, Zap, Clock, Target, BarChart3, Gauge, Activity, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ImpactData {
  total_recovered: number;
  total_attempts: number;
  successful_attempts: number;
  total_at_risk: number;
  organic_baseline: number;
  incremental_lift: number;
  automation_rate: number;
  avg_time_to_recovery_hours: number | null;
}

async function getImpactSummary(): Promise<ImpactData | null> {
  try { return apiFetch<ImpactData>("/revenue/impact-summary"); }
  catch { return null; }
}

function pct(v?: number | null) {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

export default async function AnalyticsPage() {
  const [evaluation, impact] = await Promise.all([getEvaluationSummary(), getImpactSummary()]);

  const recoveryRate = impact
    ? ((impact.successful_attempts / Math.max(impact.total_attempts, 1)) * 100).toFixed(1)
    : "—";

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Executive Outcomes</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Business Impact</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            Real intervention outcomes vs. what would have happened without PayPilot
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="badge-jade text-2xs font-mono font-bold px-3 py-1.5 rounded-xl">
            {evaluation.model.sample_size ?? 0} scored opportunities
          </span>
          <Link href={`/copilot?q=${encodeURIComponent("Give me an executive summary of our recovery performance and ROI")}`}
            className="badge-violet inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Sparkles size={12}/> Ask AI
          </Link>
        </div>
      </div>

      {/* ── Hero KPIs ── */}
      {impact ? (
        <>
          {/* Big hero figures */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Recovered",
                value: formatINR(impact.total_recovered),
                sub: "System-assisted recoveries",
                cls: "stat-glow-jade",
                borderCls: "border-jade-500/20",
                bgCls: "bg-jade-500/5",
                icon: TrendingUp,
                iconCls: "text-jade-400",
                desc: "Revenue that would have been permanently lost",
              },
              {
                label: "Incremental Lift",
                value: formatINR(impact.incremental_lift),
                sub: `vs ${formatINR(impact.organic_baseline)} organic est.`,
                cls: "text-jade-300",
                borderCls: "border-jade-500/15",
                bgCls: "bg-jade-500/3",
                icon: Zap,
                iconCls: "text-jade-300",
                desc: "Above what would have recovered without PayPilot",
              },
              {
                label: "Automation Rate",
                value: pct(impact.automation_rate),
                sub: `${impact.total_attempts} total attempts`,
                cls: "stat-glow-violet",
                borderCls: "border-violet-500/20",
                bgCls: "bg-violet-500/4",
                icon: Target,
                iconCls: "text-violet-400",
                desc: "Recoveries executed without human intervention",
              },
              {
                label: "Avg. Time to Recovery",
                value: impact.avg_time_to_recovery_hours != null
                  ? `${impact.avg_time_to_recovery_hours.toFixed(1)}h`
                  : "—",
                sub: "From failure to recovery",
                cls: "stat-glow-amber",
                borderCls: "border-amber-500/20",
                bgCls: "bg-amber-500/4",
                icon: Clock,
                iconCls: "text-amber-400",
                desc: "Median time from opportunity creation to recovered",
              },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label}
                  className={`relative overflow-hidden rounded-2xl border ${s.borderCls} ${s.bgCls} p-6 space-y-3 card-interactive cursor-default`}>
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-xl bg-base-200 border border-base-border flex items-center justify-center">
                      <Icon size={15} className={s.iconCls}/>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{s.label}</p>
                    <p className={`font-mono text-3xl font-black mt-1 ${s.cls}`}>{s.value}</p>
                    <p className="text-2xs text-ink-500 mt-1">{s.sub}</p>
                  </div>
                  <p className="text-2xs text-ink-400 leading-relaxed border-t border-base-border/40 pt-2">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Impact bar chart */}
          <section className="card-surface rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-jade-400"/>
                <h2 className="text-sm font-bold text-ink-0">Recovery vs. Baseline</h2>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-full bg-ink-400/60"/>
                  <span className="text-ink-500">Organic baseline (est. 12%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-full bg-jade-500"/>
                  <span className="text-ink-400">PayPilot recovered</span>
                </div>
              </div>
            </div>
            <ImpactBarChart data={impact}/>
            <p className="text-2xs text-ink-500 text-center">
              Causal note: Incremental lift is estimated from organic recovery baseline (12%).
              Actual causal attribution requires randomized holdout experiment.
            </p>
          </section>

          {/* Secondary metrics */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Success Rate",
                value: `${recoveryRate}%`,
                sub: `${impact.successful_attempts} / ${impact.total_attempts} attempts`,
                cls: "stat-glow-jade",
                bg: "bg-jade-500/5 border-jade-500/15",
              },
              {
                label: "Total at Risk",
                value: formatINR(impact.total_at_risk),
                sub: "Across all opportunities",
                cls: "stat-glow-coral",
                bg: "bg-coral-500/5 border-coral-500/15",
              },
              {
                label: "Organic Baseline",
                value: formatINR(impact.organic_baseline),
                sub: "Est. recovery without PayPilot",
                cls: "stat-glow-amber",
                bg: "bg-amber-500/5 border-amber-500/15",
              },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border ${s.bg} p-5 text-center space-y-2`}>
                <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono text-3xl font-black ${s.cls}`}>{s.value}</p>
                <p className="text-xs text-ink-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card-surface rounded-2xl p-12 text-center">
          <BarChart3 size={28} className="mx-auto text-ink-500 mb-3"/>
          <p className="text-sm text-ink-400">Impact data not available — seed the database first.</p>
        </div>
      )}

      {/* ── Model Performance section ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-base-border pb-3">
          <Gauge size={14} className="text-violet-400"/>
          <h2 className="text-sm font-bold text-ink-0">Model Performance</h2>
          <span className="badge-violet text-2xs font-mono font-bold px-2 py-0.5 rounded-md ml-auto">
            Heldout n={evaluation.model.sample_size ?? 0}
          </span>
        </div>

        {/* Model metrics */}
        <div className="grid grid-cols-5 gap-3">
          {[
            ["Precision",   evaluation.model.precision != null ? pct(evaluation.model.precision) : "—"],
            ["Recall",      evaluation.model.recall    != null ? pct(evaluation.model.recall)    : "—"],
            ["F1 Score",    evaluation.model.f1?.toFixed(3)         ?? "—"],
            ["ROC-AUC",     evaluation.model.roc_auc?.toFixed(3)    ?? "—"],
            ["Brier Score", evaluation.model.brier_score?.toFixed(3) ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="card-surface rounded-2xl p-4 text-center space-y-2">
              <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{label}</p>
              <p className="font-mono text-xl font-black text-ink-0">{value}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-[1.3fr_0.7fr] gap-4">
          <div className="card-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-jade-400"/>
              <h3 className="text-sm font-bold text-ink-0">Calibration Chart</h3>
              <span className="ml-auto text-xs text-ink-500">Predicted vs. Actual recovery rates</span>
            </div>
            <CalibrationChart buckets={evaluation.calibration.buckets}/>
          </div>

          <div className="card-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-violet-400"/>
              <h3 className="text-sm font-bold text-ink-0">Decision Quality</h3>
            </div>
            <div className="space-y-3">
              {[
                ["Correct interventions",     evaluation.interventions.correct_intervention,      "text-jade-300"  ],
                ["Unnecessary interventions", evaluation.interventions.unnecessary_intervention,   "text-amber-400" ],
                ["Missed opportunities",      evaluation.interventions.missed_opportunity,         "text-coral-400" ],
                ["False-positive cost",       formatINR(evaluation.interventions.false_positive_cost ?? 0), "text-coral-300"],
              ].map(([label, value, cls]) => (
                <div key={label as string}
                  className="flex items-center justify-between border-b border-base-border/60 pb-2.5 last:border-0">
                  <span className="text-xs text-ink-400">{label as string}</span>
                  <span className={`font-mono text-sm font-black ${cls as string}`}>{value as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

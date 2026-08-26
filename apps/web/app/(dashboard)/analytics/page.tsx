import { Activity, BarChart3, Gauge } from "lucide-react";
import { getEvaluationSummary } from "@/lib/api";
import { formatINR } from "@/lib/format";

function pct(value?: number | null) {
  return value == null ? "Insufficient data" : `${(value * 100).toFixed(1)}%`;
}

export default async function AnalyticsPage() {
  const evaluation = await getEvaluationSummary();
  const metrics = [
    ["Precision", pct(evaluation.model.precision)],
    ["Recall", pct(evaluation.model.recall)],
    ["F1", evaluation.model.f1?.toFixed(3) ?? "Insufficient data"],
    ["ROC-AUC", evaluation.model.roc_auc?.toFixed(3) ?? "Insufficient data"],
    ["Brier", evaluation.model.brier_score?.toFixed(3) ?? "Insufficient data"],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-ink-300">Evaluation</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-0">Model & Recovery Analytics</h1>
        </div>
        <span className="rounded-full border border-jade-500/20 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
          Heldout sample {evaluation.model.sample_size}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="animate-rise rounded-lg border border-base-border bg-base-100 p-4 shadow-card">
            <p className="text-xs text-ink-500">{label}</p>
            <p className="mt-3 font-mono text-xl text-ink-0">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <Gauge size={16} className="text-violet-400" />
            <h2 className="text-sm font-medium text-ink-0">Calibration</h2>
          </div>
          <div className="space-y-3">
            {evaluation.calibration.buckets.map((bucket) => (
              <div key={bucket.bucket}>
                <div className="mb-1 flex justify-between text-xs text-ink-300">
                  <span>{bucket.bucket}</span>
                  <span>{pct(bucket.predicted_probability)} predicted · {pct(bucket.actual_recovery_rate)} actual · n={bucket.sample_size}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-base-200">
                  <div className="h-full bg-violet-500" style={{ width: `${(bucket.predicted_probability ?? 0) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-jade-400" />
            <h2 className="text-sm font-medium text-ink-0">Recovery Economics</h2>
          </div>
          <div className="space-y-4">
            {[
              ["Revenue at risk", formatINR(evaluation.recovery.total_revenue_at_risk ?? 0)],
              ["Predicted recoverable", formatINR(evaluation.recovery.predicted_recoverable_revenue ?? 0)],
              ["Expected recovery", formatINR(evaluation.recovery.expected_recovery ?? 0)],
              ["Actual recovered", formatINR(evaluation.recovery.actual_recovered_revenue ?? 0)],
              ["Recovery rate", pct(evaluation.recovery.recovery_rate)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-base-border pb-3 last:border-0">
                <span className="text-sm text-ink-300">{label}</span>
                <span className="font-mono text-sm text-ink-0">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
        <div className="mb-5 flex items-center gap-2">
          <Activity size={16} className="text-amber-400" />
          <h2 className="text-sm font-medium text-ink-0">Decision Quality</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            ["Correct interventions", evaluation.interventions.correct_intervention],
            ["Unnecessary interventions", evaluation.interventions.unnecessary_intervention],
            ["Missed opportunities", evaluation.interventions.missed_opportunity],
            ["False-positive cost", formatINR(evaluation.interventions.false_positive_cost ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-base-50 p-4">
              <p className="text-xs text-ink-500">{label}</p>
              <p className="mt-2 font-mono text-xl text-ink-0">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

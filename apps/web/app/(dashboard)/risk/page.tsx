import { RiskSummaryBar, RiskItemsTable } from "@/components/dashboard/risk-distribution";
import { getFailureAnomaly, getRiskDistribution } from "@/lib/api";

export default async function RiskPage() {
  const [data, anomaly] = await Promise.all([getRiskDistribution(200), getFailureAnomaly()]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink-0">Risk & Recovery Scoring</h1>
        <p className="mt-1 text-sm text-ink-300">
          {data.items.length} scored opportunities, ranked by recoverability
        </p>
      </div>

      {anomaly.active && (
        <div className="rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-sm text-coral-400">
          <p className="font-medium">Failure-rate anomaly detected</p>
          <p className="mt-1 text-coral-300/90">{anomaly.message}</p>
        </div>
      )}

      <RiskSummaryBar
        high={data.high_confidence_amount}
        medium={data.medium_confidence_amount}
        low={data.low_confidence_amount}
      />
      <RiskItemsTable items={data.items} />
    </div>
  );
}

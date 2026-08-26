import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { RiskGauge } from "@/components/dashboard/risk-gauge";
import { OpportunityBreakdown } from "@/components/dashboard/opportunity-breakdown";
import { AICommandBar } from "@/components/dashboard/ai-command-bar";
import { RevenuePulse } from "@/components/dashboard/revenue-pulse";
import { Stagger, StaggerItem } from "@/components/dashboard/stagger";
import { TrendingUp, ShieldAlert, CheckCircle2 } from "lucide-react";
import { getRevenueSummary, getRevenueAtRisk } from "@/lib/api";

export default async function CommandCenterPage() {
  // NOTE: seed data is spread randomly over 180 days, not weighted toward
  // "today" — using a 180-day window here so numbers aren't near-zero.
  // Narrow this to days=1 once seed data is re-weighted toward recent activity.
  const [summary, atRisk] = await Promise.all([
    getRevenueSummary(180),
    getRevenueAtRisk(),
  ]);

  const stats = [
    {
      label: "Revenue at Risk",
      value: summary.revenue_at_risk,
      icon: ShieldAlert,
      tint: "text-coral-500",
      glow: "card-glow-coral",
    },
    {
      label: "High-Confidence Recoverable",
      value: summary.high_confidence_recoverable,
      icon: TrendingUp,
      tint: "text-amber-500",
      glow: "card-glow-amber",
    },
    {
      label: "Recovered (180d)",
      value: summary.recovered_period,
      icon: CheckCircle2,
      tint: "text-jade-400",
      glow: "card-glow-jade",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-ink-300">Good morning, Merchant.</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-0">
          Your revenue engine is healthy.
        </h1>
      </div>

      <div className="card-surface relative flex items-center justify-between overflow-hidden rounded-2xl p-8">
        <div className="relative z-[1]">
          <p className="mb-2 text-sm text-ink-300">Revenue (180d)</p>
          <AnimatedNumber
            value={summary.revenue_period}
            className="font-mono text-5xl font-semibold tabular-nums text-ink-0"
          />
        </div>
        <RevenuePulse className="pointer-events-none absolute inset-x-8 bottom-6 h-16 w-[min(100%,28rem)] opacity-90" />
        <div className="relative z-[1]">
          <RiskGauge score={summary.revenue_health_score} />
        </div>
      </div>

      <Stagger className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <div className={`card-surface card-interactive ${s.glow} rounded-2xl p-5`}>
              <div className="mb-3 flex items-center gap-2">
                <s.icon size={15} className={s.tint} />
                <span className="text-sm text-ink-300">{s.label}</span>
              </div>
              <AnimatedNumber
                value={s.value}
                className="font-mono text-2xl font-semibold tabular-nums text-ink-0"
              />
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid grid-cols-2 gap-4">
        <OpportunityBreakdown segments={atRisk.by_source} />
        <AICommandBar />
      </div>
    </div>
  );
}

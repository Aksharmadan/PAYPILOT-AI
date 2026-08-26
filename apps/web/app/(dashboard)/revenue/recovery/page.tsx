import { CheckCircle2, Clock3, Inbox, RefreshCw, XCircle } from "lucide-react";
import { getOpportunities } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export default async function RecoveryPage() {
  const opportunities = await getOpportunities({ limit: 80, sort: "created_at" });
  const completed = opportunities.items.filter((item) => item.outcome === "recovered");
  const failed = opportunities.items.filter((item) => item.outcome === "not_recovered");
  const active = opportunities.items.filter((item) => item.outcome === "pending").slice(0, 12);
  const recovered = completed.reduce((sum, item) => sum + item.amount_at_risk, 0);
  const stats = [
    { label: "Recovered", value: completed.length, sub: formatINR(recovered), Icon: CheckCircle2, color: "text-jade-400", glow: "card-glow-jade" },
    { label: "Pending", value: active.length, sub: "queued actions", Icon: Clock3, color: "text-amber-400", glow: "card-glow-amber" },
    { label: "Failed", value: failed.length, sub: "stopped safely", Icon: XCircle, color: "text-coral-400", glow: "card-glow-coral" },
    { label: "Total", value: opportunities.total, sub: "opportunities", Icon: RefreshCw, color: "text-ink-300", glow: "" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm text-ink-300">Execution Monitor</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-0">Recovery Workflows</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, Icon, color, glow }) => (
          <div key={label} className={`card-surface card-interactive ${glow} rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-500">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className="mt-3 font-mono text-2xl text-ink-0">{value}</p>
            <p className="mt-1 text-xs text-ink-300">{sub}</p>
          </div>
        ))}
      </div>

      <section className="table-shell overflow-hidden rounded-lg">
        <div className="border-b border-base-border px-5 py-4">
          <h2 className="text-sm font-medium text-ink-0">Live Queue</h2>
        </div>
        <div className="divide-y divide-base-border">
          {active.map((item) => (
            <div
              key={item.id}
              className="table-row grid grid-cols-[1fr_160px_160px_180px] items-center gap-4 px-5 py-4"
            >
              <div>
                <p className="text-sm text-ink-0">{item.customer_name ?? "Guest checkout"}</p>
                <p className="mt-1 text-xs text-ink-300">
                  {item.source} · {item.recommended_intervention.replaceAll("_", " ")}
                </p>
              </div>
              <span className="font-mono text-sm text-ink-0">{formatINR(item.amount_at_risk)}</span>
              <span className="font-mono text-sm text-jade-400">{formatINR(item.expected_recovery_value)}</span>
              <span className="rounded-md border border-base-border bg-base-50 px-2 py-1 text-center text-xs text-ink-300">
                {item.policy_status.replaceAll("_", " ")}
              </span>
            </div>
          ))}
          {active.length === 0 ? (
            <EmptyState
              icon={<Inbox size={18} />}
              title="Queue is clear"
              description="No pending recovery actions right now. New failed payments will land here automatically."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

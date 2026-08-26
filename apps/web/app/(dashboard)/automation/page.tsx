import { CheckCircle2, ShieldAlert, Zap } from "lucide-react";
import { getOpportunities } from "@/lib/api";
import { formatINR } from "@/lib/format";

const policyLabels = {
  auto: "Auto",
  approval_required: "Approval",
  escalated: "Escalation",
  blocked: "Blocked",
};

const policyStyle: Record<string, string> = {
  auto: "border-jade-500/30 bg-jade-500/10 text-jade-300",
  approval_required: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  escalated: "border-coral-500/30 bg-coral-500/10 text-coral-400",
  blocked: "border-base-border bg-base-200 text-ink-300",
};

export default async function AutomationPage() {
  const opportunities = await getOpportunities({ limit: 120, sort: "expected_recovery" });
  const grouped = opportunities.items.reduce<Record<string, typeof opportunities.items>>((acc, item) => {
    acc[item.policy_status] = acc[item.policy_status] ?? [];
    acc[item.policy_status].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-ink-300">Deterministic Recovery Policy</p>
        <h1 className="text-2xl font-semibold text-ink-0 mt-1">Automation & Approval Center</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries(policyLabels).map(([key, label]) => {
          const rows = grouped[key] ?? [];
          const amount = rows.reduce((sum, row) => sum + row.expected_recovery_value, 0);
          return (
            <div key={key} className="rounded-lg border border-base-border bg-base-100 p-4">
              <div className="flex items-center justify-between">
                <span className={`rounded-md border px-2 py-1 text-xs ${policyStyle[key]}`}>{label}</span>
                {key === "auto" ? <Zap size={15} className="text-jade-300" /> : <ShieldAlert size={15} className="text-ink-400" />}
              </div>
              <p className="mt-4 font-mono text-2xl text-ink-0 tabular-nums">{rows.length}</p>
              <p className="mt-1 text-xs text-ink-400">{formatINR(amount)} expected recovery</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(policyLabels).slice(0, 3).map(([key, label]) => (
          <section key={key} className="rounded-lg border border-base-border bg-base-100">
            <div className="border-b border-base-border px-4 py-3">
              <h2 className="text-sm font-medium text-ink-0">{label} Queue</h2>
            </div>
            <div className="divide-y divide-base-border">
              {(grouped[key] ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-ink-0">{item.customer_name ?? "Guest checkout"}</p>
                      <p className="mt-1 text-xs text-ink-400">{item.recommended_intervention.replaceAll("_", " ")}</p>
                    </div>
                    <span className="font-mono text-sm text-jade-300 tabular-nums">{formatINR(item.expected_recovery_value)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
                    <CheckCircle2 size={13} className={item.policy_checks.every((check) => check.passed) ? "text-jade-300" : "text-coral-400"} />
                    {item.policy_checks.filter((check) => check.passed).length}/{item.policy_checks.length} checks passed
                  </div>
                </div>
              ))}
              {(grouped[key] ?? []).length === 0 && (
                <div className="p-6 text-sm text-ink-400">No opportunities in this queue.</div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

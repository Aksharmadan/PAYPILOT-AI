import { revalidatePath } from "next/cache";
import { Inbox } from "lucide-react";
import { approveOpportunity, getOpportunities, rejectOpportunity, simulateOpportunity } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { OpportunityActions } from "@/components/dashboard/opportunity-actions";
import { EmptyState } from "@/components/ui/empty-state";

async function simulateAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const outcome = String(formData.get("outcome")) as "success" | "failure";
  await simulateOpportunity(id, outcome);
  revalidatePath("/revenue/opportunities");
}

async function approveAction(formData: FormData) {
  "use server";
  await approveOpportunity(String(formData.get("id")));
  revalidatePath("/revenue/opportunities");
}

async function rejectAction(formData: FormData) {
  "use server";
  await rejectOpportunity(String(formData.get("id")));
  revalidatePath("/revenue/opportunities");
}

const badge: Record<string, string> = {
  critical: "text-coral-400 border-coral-500/30 bg-coral-500/10",
  high: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  medium: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  low: "text-ink-300 border-base-border bg-base-200",
  auto: "text-jade-300 border-jade-500/30 bg-jade-500/10",
  approval_required: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  escalated: "text-coral-400 border-coral-500/30 bg-coral-500/10",
  blocked: "text-ink-300 border-base-border bg-base-200",
};

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities({ limit: 40, sort: "expected_recovery" });
  const totalExpected = opportunities.items.reduce((sum, item) => sum + item.expected_recovery_value, 0);
  const openCount = opportunities.items.filter((item) => item.action_status === "open").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-300">Revenue Intelligence Engine</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-0">Recovery Opportunities</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface rounded-lg px-4 py-3">
            <p className="text-xs text-ink-400">Open opportunities</p>
            <p className="font-mono text-xl tabular-nums text-ink-0">{openCount}</p>
          </div>
          <div className="card-surface rounded-lg px-4 py-3">
            <p className="text-xs text-ink-400">Expected recovery</p>
            <p className="font-mono text-xl tabular-nums text-ink-0">{formatINR(totalExpected)}</p>
          </div>
        </div>
      </div>

      <div className="table-shell overflow-hidden rounded-lg">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[1] bg-base-200/95 text-ink-400 backdrop-blur">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Customer / Source</th>
                <th className="px-4 py-3 text-right font-medium">At Risk</th>
                <th className="px-4 py-3 text-right font-medium">Probability</th>
                <th className="px-4 py-3 text-right font-medium">Expected</th>
                <th className="px-4 py-3 text-left font-medium">Decision</th>
                <th className="px-4 py-3 text-left font-medium">Evidence</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {opportunities.items.map((item) => (
                <tr
                  key={item.id}
                  className={`table-row align-top ${
                    item.priority === "critical"
                      ? "hover:shadow-[0_0_24px_rgba(240,85,76,0.07)]"
                      : item.policy_status === "auto"
                        ? "hover:shadow-[0_0_24px_rgba(34,192,138,0.07)]"
                        : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="text-ink-0">{item.customer_name ?? "Guest checkout"}</div>
                    <div className="mt-1 text-xs text-ink-400">
                      {item.source} · {item.recommended_intervention.replaceAll("_", " ")}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-ink-0">
                    {formatINR(item.amount_at_risk)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-ink-0">
                    {(item.recovery_probability * 100).toFixed(1)}%
                    <div className="text-xs text-ink-500">
                      {(item.intervention_success_probability * 100).toFixed(0)}% action
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-jade-300">
                    {formatINR(item.expected_recovery_value)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-md border px-2 py-1 text-xs ${badge[item.priority]}`}>
                        {item.priority}
                      </span>
                      <span className={`rounded-md border px-2 py-1 text-xs ${badge[item.policy_status]}`}>
                        {item.policy_status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-ink-400">
                      {item.action_status} · {item.outcome}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-sm text-xs text-ink-300">
                      {item.reason_codes.slice(0, 3).join(" · ")}
                    </div>
                    <div className="mt-2 space-y-1">
                      {item.policy_checks.slice(0, 2).map((check) => (
                        <div
                          key={check.name}
                          className={check.passed ? "text-xs text-jade-300" : "text-xs text-coral-400"}
                        >
                          {check.passed ? "Pass" : "Block"}: {check.detail}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <OpportunityActions
                      id={item.id}
                      approveAction={approveAction}
                      rejectAction={rejectAction}
                      simulateAction={simulateAction}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {opportunities.items.length === 0 ? (
            <EmptyState
              icon={<Inbox size={18} />}
              title="No pending recovery opportunities"
              description="When failed payments or past-due subscriptions enter the queue, scored opportunities will appear here."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

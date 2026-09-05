import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  Inbox, TrendingUp, Filter, Zap, AlertTriangle, CheckCircle2,
  Clock, Shield, ArrowRight, Sparkles, Target, ChevronRight,
} from "lucide-react";
import { approveOpportunity, getOpportunities, rejectOpportunity, simulateOpportunity } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { OpportunityActions } from "@/components/dashboard/opportunity-actions";
import { ExecuteRecoveryButton } from "@/components/dashboard/execute-recovery-button";
import { EmptyState } from "@/components/ui/empty-state";

/* ── Server actions ─────────────────────────────── */
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

/* ── Badge helpers ──────────────────────────────── */
const policyBadge: Record<string, string> = {
  auto:             "badge-jade",
  approval_required:"badge-amber",
  escalated:        "badge-coral",
  blocked:          "badge-neutral",
};
const actionBadge: Record<string, string> = {
  open:      "badge-neutral",
  approved:  "badge-jade",
  executing: "badge-amber",
  completed: "badge-jade",
  failed:    "badge-coral",
  rejected:  "badge-neutral",
};
const priorityDot: Record<string, string> = {
  critical: "bg-coral-500 shadow-[0_0_6px_rgba(240,85,76,0.8)]",
  high:     "bg-amber-500 shadow-[0_0_6px_rgba(232,162,61,0.6)]",
  medium:   "bg-violet-500",
  low:      "bg-ink-500",
};

function whySentence(codes: string[]): string {
  const parts: string[] = [];
  for (const code of codes) {
    const [key, val] = code.split(":");
    if (key === "failure_reason") parts.push(`${(val || "").replaceAll("_", " ")}`);
    else if (key === "payment_method") parts.push(`via ${val}`);
    else if (key === "retry_count") parts.push(`${val} prior ${parseInt(val) === 1 ? "retry" : "retries"}`);
    else if (code === "customer:prior_recovery_success") parts.push("prior recovery success");
    else if (key === "churn_risk") parts.push(`churn: ${val}`);
    else if (key === "source") parts.push((val || "").replaceAll("_", " "));
    else if (key === "days_past_due") parts.push(`${val}d past due`);
    else if (key === "plan") parts.push(val || "");
  }
  return parts.slice(0, 3).join(" · ") || "—";
}

/* ── Prob arc ───────────────────────────────────── */
function ProbArc({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 1);
  const r = 12; const circ = 2 * Math.PI * r;
  const color = pct >= 0.7 ? "#34E8A0" : pct >= 0.4 ? "#FBC66B" : "#FF8177";
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90 shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="hsl(var(--base-300))" strokeWidth="3"/>
      <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}/>
    </svg>
  );
}

/* ── Page ───────────────────────────────────────── */
export default async function OpportunitiesPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const params     = await searchParams;
  const source     = params.source     || "";
  const confidence = params.confidence || "";
  const status     = params.status     || "";

  const opportunities = await getOpportunities({
    limit: 60, sort: "expected_recovery",
    source:     source     || undefined,
    confidence: confidence || undefined,
    status:     status     || undefined,
  });

  const items          = opportunities.items;
  const totalExpected  = items.reduce((s, i) => s + i.expected_recovery_value, 0);
  const totalAtRisk    = items.reduce((s, i) => s + i.amount_at_risk, 0);
  const openCount      = items.filter(i => i.action_status === "open").length;
  const autoCount      = items.filter(i => i.policy_status === "auto" && i.action_status === "open").length;
  const highConfCount  = items.filter(i => i.confidence === "high").length;

  const bySource: Record<string, number> = {};
  for (const opp of items) bySource[opp.source] = (bySource[opp.source] || 0) + opp.amount_at_risk;
  const sources   = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const maxAmount = sources[0]?.[1] || 1;
  const sourceColor: Record<string, string> = {
    payment: "progress-bar-coral", checkout: "progress-bar-amber", subscription: "progress-bar-violet",
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Recovery Queue</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Opportunities</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            Every failure scored, policy-evaluated, and ready to action.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/demo"
            className="badge-amber inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-80">
            <Zap size={12}/> Simulate
          </Link>
          {(source || confidence || status) && (
            <Link href="/revenue/opportunities"
              className="btn-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium">
              Clear filters
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total at Risk",      value: formatINR(totalAtRisk),   cls: "stat-glow-coral" },
          { label: "Expected Recovery",  value: formatINR(totalExpected), cls: "stat-glow-jade" },
          { label: "Open Cases",         value: String(openCount),        cls: "text-ink-0" },
          { label: "Auto-Eligible",      value: String(autoCount),        cls: "text-jade-400" },
          { label: "High Confidence",    value: String(highConfCount),    cls: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="card-surface rounded-2xl p-4 space-y-1.5 card-interactive cursor-default">
            <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-xl font-black tabular-nums ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Source leak map ── */}
      {sources.length > 0 && (
        <section className="card-surface rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-coral-400"/>
            <h2 className="text-sm font-bold text-ink-0">Revenue Leak Map</h2>
            <span className="text-2xs text-ink-500 font-mono ml-1">— click to filter by source</span>
          </div>
          <div className="space-y-2.5">
            {sources.map(([src, amt]) => (
              <Link key={src} href={`?source=${src}`} className="flex items-center gap-3 group">
                <span className="w-24 text-2xs font-mono font-bold text-ink-400 capitalize group-hover:text-ink-0 transition-colors">{src}</span>
                <div className="flex-1 h-2 rounded-full bg-base-300/60 overflow-hidden">
                  <div className={`h-full rounded-full ${sourceColor[src] ?? "bg-ink-400"} transition-all`}
                    style={{ width: `${(amt / maxAmount) * 100}%` }}/>
                </div>
                <span className={`w-20 text-right font-mono text-xs font-bold tabular-nums ${source === src ? "text-ink-0" : "text-ink-500"}`}>
                  {formatINR(amt)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={12} className="text-ink-500"/>
        <span className="text-2xs font-mono text-ink-500 mr-1">SOURCE</span>
        {["payment","checkout","subscription"].map(s => (
          <Link key={s} href={`?source=${s}`}
            className={`rounded-xl border px-3 py-1 text-2xs font-mono font-bold transition capitalize ${
              source === s
                ? "border-violet-500/40 bg-violet-500/12 text-violet-300"
                : "border-base-border text-ink-500 hover:text-ink-300 hover:border-base-border"
            }`}>{s}</Link>
        ))}
        <span className="text-base-border mx-1">|</span>
        <span className="text-2xs font-mono text-ink-500 mr-1">CONF</span>
        {["high","medium","low"].map(c => (
          <Link key={c} href={`?confidence=${c}`}
            className={`rounded-xl border px-3 py-1 text-2xs font-mono font-bold transition capitalize ${
              confidence === c
                ? "border-jade-500/40 bg-jade-500/12 text-jade-300"
                : "border-base-border text-ink-500 hover:text-ink-300"
            }`}>{c}</Link>
        ))}
        <span className="text-base-border mx-1">|</span>
        <span className="text-2xs font-mono text-ink-500 mr-1">STATUS</span>
        {["open","approved","completed"].map(st => (
          <Link key={st} href={`?status=${st}`}
            className={`rounded-xl border px-3 py-1 text-2xs font-mono font-bold transition capitalize ${
              status === st
                ? "border-amber-500/40 bg-amber-500/12 text-amber-300"
                : "border-base-border text-ink-500 hover:text-ink-300"
            }`}>{st}</Link>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="table-shell">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[1] bg-base-200/95 backdrop-blur-md">
              <tr className="border-b border-base-border">
                {["Customer · Source","At Risk","Probability","Expected","Policy","Why","Action"].map(h => (
                  <th key={h} className={`px-4 py-3 text-2xs font-bold text-ink-500 uppercase tracking-widest ${h==="At Risk"||h==="Expected"||h==="Probability" ? "text-right" : h==="Action" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}
                  className={`table-row align-top ${item.outcome === "recovered" ? "opacity-50" : ""}`}>

                  {/* Customer */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[item.priority] ?? "bg-ink-500"}`}/>
                      <div className="min-w-0">
                        {item.customer_name ? (
                          <Link href={`/customers/${item.customer_id}`}
                            className="text-xs font-semibold text-ink-0 hover:text-violet-300 transition-colors truncate block">
                            {item.customer_name}
                          </Link>
                        ) : (
                          <span className="text-xs text-ink-400">Guest checkout</span>
                        )}
                        <p className="text-2xs text-ink-500 capitalize truncate mt-0.5">
                          {item.source} · {item.recommended_intervention.replaceAll("_"," ")}
                        </p>
                      </div>
                    </div>
                    {item.outcome === "recovered" && (
                      <div className="mt-1 flex items-center gap-1 text-2xs text-jade-400">
                        <CheckCircle2 size={9}/> Recovered
                      </div>
                    )}
                  </td>

                  {/* At risk */}
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold tabular-nums text-ink-0 whitespace-nowrap">
                    {formatINR(item.amount_at_risk)}
                  </td>

                  {/* Probability */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative">
                        <ProbArc value={item.recovery_probability}/>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-mono text-2xs font-black text-ink-0">{Math.round(item.recovery_probability*100)}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Expected */}
                  <td className="px-4 py-3 text-right font-mono text-sm font-black tabular-nums stat-glow-jade whitespace-nowrap">
                    {formatINR(item.expected_recovery_value)}
                  </td>

                  {/* Policy */}
                  <td className="px-4 py-3 space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      <span className={`${policyBadge[item.policy_status] ?? "badge-neutral"} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>
                        {item.policy_status.replaceAll("_"," ")}
                      </span>
                    </div>
                    <span className={`${actionBadge[item.action_status] ?? "badge-neutral"} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>
                      {item.action_status}
                    </span>
                    <div className="space-y-0.5">
                      {item.policy_checks.slice(0,2).map(check => (
                        <div key={check.name}
                          className={`text-2xs ${check.passed ? "text-jade-400/80" : "text-coral-400/80"}`}>
                          {check.passed ? "✓" : "✗"} {check.detail}
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Why */}
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-2xs text-ink-400 leading-relaxed">{whySentence(item.reason_codes)}</p>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-base-300/50 overflow-hidden">
                      <div className="h-full rounded-full progress-bar-jade"
                        style={{ width: `${item.recovery_probability * 100}%` }}/>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-1.5">
                      <OpportunityActions id={item.id} approveAction={approveAction}
                        rejectAction={rejectAction} simulateAction={simulateAction}/>
                      {(item.policy_status === "auto" || item.action_status === "approved") &&
                        item.action_status !== "completed" && item.action_status !== "failed" &&
                        item.outcome === "pending" && (
                        <ExecuteRecoveryButton opportunityId={item.id}
                          expectedRecovery={item.expected_recovery_value}/>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <EmptyState icon={<Inbox size={18}/>}
              title="No opportunities match this filter"
              description="Try clearing filters or running a demo to generate new opportunities."/>
          )}
        </div>
      </div>

      <p className="text-2xs text-ink-500 text-center font-mono">
        Showing {items.length} of {opportunities.total} opportunities · sorted by expected recovery value
      </p>
    </div>
  );
}

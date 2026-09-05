import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Activity,
  Shield,
  Zap,
  ArrowRight,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RiskFactor {
  factor: string;
  severity: "critical" | "warning" | "healthy";
  detail: string;
}

interface TimelineEvent {
  ts: string;
  type: string;
  title: string;
  detail: string;
  icon: string;
  severity?: "critical" | "warning" | "success" | "info";
  amount?: number;
}

interface OpenOpportunity {
  id: string;
  source: string;
  amount_at_risk: number;
  recovery_probability: number;
  expected_recovery_value: number;
  priority: string;
  confidence: string;
  recommended_intervention: string;
  policy_status: string;
  action_status: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  country: string | null;
  plan: string | null;
  segment: string | null;
  created_at: string;
  lifetime_value: number;
  churn_risk_score: number;
  health_score: number;
  subscription: {
    plan_name: string;
    mrr: number;
    status: string;
    current_period_end: string;
  } | null;
  mrr: number;
  mrr_at_risk: number;
  total_payments: number;
  payment_success_rate: number;
  failed_payment_count: number;
  successful_renewals: number;
  failed_renewals: number;
  total_recovery_attempts: number;
  recovery_success_rate: number;
  total_recovered: number;
  revenue_at_risk: number;
  expected_recovery: number;
  open_opportunity: OpenOpportunity | null;
  risk_factors: RiskFactor[];
  recommended_action: string;
  timeline: TimelineEvent[];
  recent_payments: {
    id: string;
    amount: number;
    status: string;
    failure_reason: string | null;
    payment_method: string | null;
    retry_count: number;
    created_at: string;
  }[];
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  try {
    return await apiFetch<CustomerDetail>(`/customers/${id}/detail`);
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-jade-500" : score >= 40 ? "bg-amber-500" : "bg-coral-500";
  const label = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  const labelColor = score >= 70 ? "text-jade-400" : score >= 40 ? "text-amber-400" : "text-coral-400";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-ink-400">Health Score</span>
        <span className={`font-mono font-semibold ${labelColor}`}>{score} / 100 · {label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-base-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "text-jade-400 bg-jade-500/10 border-jade-500/20",
    past_due: "text-coral-400 bg-coral-500/10 border-coral-500/20",
    canceled: "text-ink-400 bg-base-200 border-base-border",
    trialing: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    auto: "text-jade-400 bg-jade-500/10 border-jade-500/20",
    approval_required: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    escalated: "text-coral-400 bg-coral-500/10 border-coral-500/20",
    blocked: "text-ink-400 bg-base-200 border-base-border",
  };
  const cls = map[status] ?? "text-ink-300 bg-base-100 border-base-border";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function TimelineIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    customer_created: <User size={12} />,
    subscription_started: <CreditCard size={12} />,
    subscription_past_due: <AlertTriangle size={12} />,
    subscription_canceled: <XCircle size={12} />,
    payment_succeeded: <CheckCircle2 size={12} />,
    payment_failed: <XCircle size={12} />,
    payment_refunded: <RotateCcw size={12} />,
    recovery_succeeded: <TrendingUp size={12} />,
    recovery_failed: <AlertTriangle size={12} />,
    recovery_pending: <Clock size={12} />,
  };
  return <>{map[type] ?? <Activity size={12} />}</>;
}

function TimelineSeverityColor(severity?: string) {
  if (severity === "success") return "border-jade-500/30 bg-jade-500/10 text-jade-400";
  if (severity === "critical") return "border-coral-500/30 bg-coral-500/10 text-coral-400";
  if (severity === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  return "border-base-border bg-base-50 text-ink-400";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) notFound();

  const healthColor =
    customer.health_score >= 70 ? "text-jade-400" : customer.health_score >= 40 ? "text-amber-400" : "text-coral-400";

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-enter">
      {/* ── Back nav ── */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-0 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Customers
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-base-200 border border-base-border text-ink-0 text-xl font-semibold">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink-0">{customer.name}</h1>
            <p className="text-sm text-ink-400">{customer.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              {customer.plan && (
                <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                  {customer.plan}
                </span>
              )}
              {customer.segment && (
                <span className="rounded-md border border-base-border bg-base-50 px-2 py-0.5 text-[10px] text-ink-300 capitalize">
                  {customer.segment.replaceAll("_", " ")}
                </span>
              )}
              {customer.country && (
                <span className="text-[10px] text-ink-500">{customer.country}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-ink-500 uppercase tracking-wide">Member since</p>
          <p className="text-sm text-ink-300">{new Date(customer.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Lifetime Value", value: formatINR(customer.lifetime_value), color: "text-ink-0" },
          { label: "MRR", value: customer.mrr ? formatINR(customer.mrr) : "—", color: "text-violet-400" },
          { label: "Revenue at Risk", value: customer.revenue_at_risk > 0 ? formatINR(customer.revenue_at_risk) : "—", color: "text-coral-400" },
          { label: "Total Recovered", value: customer.total_recovered > 0 ? formatINR(customer.total_recovered) : "—", color: "text-jade-400" },
          { label: "Health Score", value: `${customer.health_score} / 100`, color: healthColor },
        ].map((s) => (
          <div key={s.label} className="card-surface rounded-xl p-4 space-y-1.5">
            <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">{s.label}</p>
            <p className={`font-mono text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-[1.3fr_0.7fr] gap-4">
        {/* Left col */}
        <div className="space-y-4">
          {/* Health overview */}
          <section className="card-surface rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-jade-400" />
              <h2 className="text-sm font-medium text-ink-0">Customer Health Overview</h2>
            </div>
            <HealthBar score={customer.health_score} />
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg bg-base-50 border border-base-border p-3 text-center">
                <p className="text-[10px] text-ink-500 uppercase">Payment Success</p>
                <p className={`mt-1 font-mono text-lg font-bold ${customer.payment_success_rate >= 0.8 ? "text-jade-400" : "text-coral-400"}`}>
                  {(customer.payment_success_rate * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-ink-500">{customer.total_payments} payments</p>
              </div>
              <div className="rounded-lg bg-base-50 border border-base-border p-3 text-center">
                <p className="text-[10px] text-ink-500 uppercase">Recovery Rate</p>
                <p className={`mt-1 font-mono text-lg font-bold ${customer.recovery_success_rate >= 0.5 ? "text-jade-400" : "text-amber-400"}`}>
                  {customer.total_recovery_attempts > 0 ? `${(customer.recovery_success_rate * 100).toFixed(0)}%` : "—"}
                </p>
                <p className="text-[10px] text-ink-500">{customer.total_recovery_attempts} attempts</p>
              </div>
              <div className="rounded-lg bg-base-50 border border-base-border p-3 text-center">
                <p className="text-[10px] text-ink-500 uppercase">Churn Risk</p>
                <p className={`mt-1 font-mono text-lg font-bold ${customer.churn_risk_score >= 0.6 ? "text-coral-400" : customer.churn_risk_score >= 0.35 ? "text-amber-400" : "text-jade-400"}`}>
                  {(customer.churn_risk_score * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-ink-500">probability</p>
              </div>
            </div>
            {/* Recommended action */}
            {customer.recommended_action && (
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 flex items-start gap-2.5">
                <Zap size={13} className="text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-violet-300 uppercase tracking-wide">Recommended Action</p>
                  <p className="mt-0.5 text-sm text-ink-100">{customer.recommended_action}</p>
                </div>
              </div>
            )}
          </section>

          {/* Open recovery opportunity */}
          {customer.open_opportunity && (
            <section className="rounded-xl border border-jade-500/20 bg-jade-500/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-jade-400" />
                  <h2 className="text-sm font-medium text-ink-0">Open Recovery Opportunity</h2>
                </div>
                <StatusBadge status={customer.open_opportunity.policy_status} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-ink-500">At Risk</p>
                  <p className="font-mono text-base font-bold text-coral-400">{formatINR(customer.open_opportunity.amount_at_risk)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-500">Recovery Probability</p>
                  <p className="font-mono text-base font-bold text-ink-0">{(customer.open_opportunity.recovery_probability * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-500">Expected Recovery</p>
                  <p className="font-mono text-base font-bold text-jade-400">{formatINR(customer.open_opportunity.expected_recovery_value)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <span className="capitalize">{customer.open_opportunity.recommended_intervention.replaceAll("_", " ")}</span>
                  <span>·</span>
                  <StatusBadge status={customer.open_opportunity.confidence} />
                  <StatusBadge status={customer.open_opportunity.priority} />
                </div>
                <Link
                  href={`/revenue/opportunities?id=${customer.open_opportunity.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-jade-400 hover:text-jade-300 transition-colors"
                >
                  Review in queue
                  <ArrowRight size={12} />
                </Link>
              </div>
            </section>
          )}

          {/* Activity Timeline */}
          <section className="card-surface rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-violet-400" />
              <h2 className="text-sm font-medium text-ink-0">Activity Timeline</h2>
              <span className="ml-auto text-[10px] text-ink-500">{customer.timeline.length} events</span>
            </div>
            <div className="relative space-y-0">
              {customer.timeline.slice(0, 20).map((event, i) => (
                <div key={`${event.type}-${i}`} className="flex gap-3">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${TimelineSeverityColor(event.severity)}`}>
                      <TimelineIcon type={event.type} />
                    </div>
                    {i < customer.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-base-border my-1" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-0 leading-tight">{event.title}</p>
                        <p className="text-xs text-ink-400 mt-0.5 leading-relaxed">{event.detail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-ink-500 whitespace-nowrap">
                          {new Date(event.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                        {event.amount != null && event.amount > 0 && (
                          <p className={`text-xs font-mono font-semibold ${event.severity === "success" ? "text-jade-400" : "text-ink-300"}`}>
                            {formatINR(event.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {customer.timeline.length === 0 && (
                <p className="text-sm text-ink-400 text-center py-6">No activity recorded yet.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Subscription card */}
          {customer.subscription ? (
            <section className="card-surface rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-violet-400" />
                <h2 className="text-sm font-medium text-ink-0">Subscription</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-400">Plan</span>
                  <span className="text-sm font-medium text-ink-0">{customer.subscription.plan_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-400">MRR</span>
                  <span className="font-mono text-sm font-bold text-violet-400">{formatINR(customer.subscription.mrr)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-400">Status</span>
                  <StatusBadge status={customer.subscription.status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-400">Next renewal</span>
                  <span className="text-xs text-ink-300">
                    {new Date(customer.subscription.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-base-border pt-3">
                  <span className="text-xs text-ink-400">Renewals</span>
                  <span className="text-xs">
                    <span className="text-jade-400">{customer.successful_renewals} succeeded</span>
                    {" / "}
                    <span className={customer.failed_renewals > 0 ? "text-coral-400" : "text-ink-400"}>
                      {customer.failed_renewals} failed
                    </span>
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <section className="card-surface rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw size={14} className="text-ink-500" />
                <h2 className="text-sm font-medium text-ink-0">Subscription</h2>
              </div>
              <p className="text-xs text-ink-400">No active subscription.</p>
            </section>
          )}

          {/* Risk signals */}
          <section className="card-surface rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-coral-400" />
              <h2 className="text-sm font-medium text-ink-0">Risk Signals</h2>
            </div>
            <div className="space-y-2">
              {customer.risk_factors.map((rf, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 space-y-1 ${
                    rf.severity === "critical"
                      ? "border-coral-500/20 bg-coral-500/5"
                      : rf.severity === "warning"
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-jade-500/20 bg-jade-500/5"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {rf.severity === "critical" ? (
                      <AlertTriangle size={11} className="text-coral-400 shrink-0" />
                    ) : rf.severity === "warning" ? (
                      <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 size={11} className="text-jade-400 shrink-0" />
                    )}
                    <p className={`text-xs font-medium ${rf.severity === "critical" ? "text-coral-400" : rf.severity === "warning" ? "text-amber-400" : "text-jade-400"}`}>
                      {rf.factor}
                    </p>
                  </div>
                  <p className="text-[11px] text-ink-400 pl-4">{rf.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recent payments */}
          <section className="card-surface rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-amber-400" />
              <h2 className="text-sm font-medium text-ink-0">Recent Payments</h2>
              <span className="ml-auto text-[10px] text-ink-500">{customer.total_payments} total</span>
            </div>
            <div className="space-y-2">
              {customer.recent_payments.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-base-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.status === "succeeded" ? (
                      <CheckCircle2 size={12} className="text-jade-400 shrink-0" />
                    ) : p.status === "failed" ? (
                      <XCircle size={12} className="text-coral-400 shrink-0" />
                    ) : (
                      <RotateCcw size={12} className="text-amber-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-ink-300 capitalize">
                        {p.failure_reason ? p.failure_reason.replaceAll("_", " ") : p.payment_method || "payment"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-mono font-semibold ${p.status === "succeeded" ? "text-ink-0" : "text-coral-400"}`}>
                      {formatINR(p.amount)}
                    </p>
                    <p className="text-[10px] text-ink-500">
                      {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
              {customer.recent_payments.length === 0 && (
                <p className="text-xs text-ink-400">No payment history.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

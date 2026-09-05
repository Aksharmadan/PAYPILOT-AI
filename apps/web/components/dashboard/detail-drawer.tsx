"use client";

import { useEffect, useState } from "react";
import {
  X, Loader2, User, CreditCard, TrendingUp, FileText,
  CheckCircle2, XCircle, AlertCircle, Calendar, ShieldCheck,
  Briefcase, Layers, ArrowRight, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatINR } from "@/lib/format";
import Link from "next/link";

interface DetailDrawerProps {
  id: string;
  type: "customer" | "payment" | "subscription" | "opportunity";
  onClose: () => void;
}

/* ── Helpers ─────────────────────────────────── */
const TYPE_ICON: Record<string, React.ReactNode> = {
  customer:    <User size={16}/>,
  payment:     <CreditCard size={16}/>,
  subscription:<FileText size={16}/>,
  opportunity: <TrendingUp size={16}/>,
};
const TYPE_LABEL: Record<string, { title: string; subtitle: string }> = {
  customer:    { title: "Customer Profile",        subtitle: "Customer 360 · Identity & Risk" },
  payment:     { title: "Payment Audit",           subtitle: "Transaction record" },
  subscription:{ title: "Subscription Status",     subtitle: "Recurring revenue" },
  opportunity: { title: "Recovery Opportunity",    subtitle: "Scored · Policy-evaluated" },
};

function Field({ label, value, mono = false, cls = "" }: {
  label: string; value: React.ReactNode; mono?: boolean; cls?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-base-border/50 last:border-0">
      <span className="text-2xs text-ink-500 font-mono uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-bold ${mono ? "font-mono" : ""} ${cls || "text-ink-100"}`}>{value}</span>
    </div>
  );
}

/* ── Main drawer ─────────────────────────────── */
export function DetailDrawer({ id, type, onClose }: DetailDrawerProps) {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true); setError(null); setData(null);
      try {
        const PATH_MAP: Record<string, string> = {
          customer:    `/customers/${id}`,
          payment:     `/payments/${id}`,
          subscription:`/subscriptions/${id}`,
          opportunity: `/opportunities/${id}`,
        };
        const res  = await fetch(`/api/proxy?path=${encodeURIComponent(PATH_MAP[type])}`);
        if (!res.ok) throw new Error("Failed to load details");
        setData(await res.json());
      } catch (err: any) {
        setError(err.message || "Failed to fetch details.");
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id, type]);

  const meta = TYPE_LABEL[type];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="relative z-10 h-full w-[500px] glass-panel flex flex-col"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-base-200/80 border border-base-border flex items-center justify-center text-ink-300">
              {TYPE_ICON[type]}
            </div>
            <div>
              <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{meta.subtitle}</p>
              <h3 className="text-sm font-bold text-ink-0 mt-0.5">{meta.title}</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-ink-500 hover:bg-white/6 hover:text-ink-300 transition-all">
            <X size={15}/>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400"/>
              <p className="text-xs text-ink-500 font-mono">Fetching live record…</p>
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-coral-500/30 bg-coral-500/10 p-5 text-center">
              <AlertCircle size={20} className="mx-auto mb-2 text-coral-400"/>
              <p className="text-xs text-coral-300">{error}</p>
            </div>
          )}
          {data && (
            <div className="animate-enter">
              {type === "customer"     && <CustomerDetails    data={data}/>}
              {type === "payment"      && <PaymentDetails     data={data}/>}
              {type === "subscription" && <SubscriptionDetails data={data}/>}
              {type === "opportunity"  && <OpportunityDetails  data={data}/>}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-white/6 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          {data && type === "customer" && (
            <Link href={`/copilot?q=${encodeURIComponent(`Tell me about customer ${data.name} — their risk and recovery history`)}`}
              onClick={onClose}
              className="badge-violet inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl hover:opacity-80 transition">
              <Sparkles size={11}/> Ask AI about this customer
            </Link>
          )}
          {data && type === "opportunity" && (
            <Link href="/revenue/opportunities" onClick={onClose}
              className="btn-glow-jade inline-flex items-center gap-1.5 rounded-xl bg-jade-500 px-4 py-2 text-xs font-bold text-base-0">
              <TrendingUp size={12}/> Open in Recovery Queue
            </Link>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose}
              className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold">
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Customer ────────────────────────────────── */
function CustomerDetails({ data }: { data: any }) {
  const pct   = Math.round(data.churn_risk_score * 100);
  const riskBadge = pct >= 70 ? "badge-coral" : pct >= 40 ? "badge-amber" : "badge-jade";
  const riskLabel = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";

  return (
    <div className="space-y-5">
      {/* Identity hero */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center text-lg font-black text-violet-400">
              {data.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink-0">{data.name}</h4>
              <p className="text-2xs text-ink-500 mt-0.5">{data.email}</p>
            </div>
          </div>
          <span className={`${riskBadge} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>
            {riskLabel} Risk
          </span>
        </div>

        {/* Churn score bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-2xs">
            <span className="text-ink-500 font-mono">Churn Risk Score</span>
            <span className={`font-mono font-black ${pct >= 70 ? "text-coral-400" : pct >= 40 ? "text-amber-400" : "text-jade-400"}`}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-base-300/60 overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 70 ? "progress-bar-coral" : pct >= 40 ? "progress-bar-amber" : "progress-bar-jade"}`}
              style={{ width: `${pct}%` }}/>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xs font-mono text-ink-500 uppercase">Lifetime Value</p>
          <p className="font-mono text-xl font-black stat-glow-jade mt-1">{formatINR(data.lifetime_value)}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xs font-mono text-ink-500 uppercase">Plan</p>
          <p className="text-sm font-black text-ink-0 capitalize mt-1">{data.plan || "Free"}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="glass-card rounded-2xl px-4 py-2">
        <Field label="Country"   value={data.country || "IN"}/>
        <Field label="Segment"   value={<span className="capitalize">{data.segment || "Standard"}</span>}/>
        <Field label="Member since" value={new Date(data.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}/>
        <Field label="Customer ID"  value={<span className="truncate max-w-[160px] block">{data.id}</span>} mono/>
      </div>
    </div>
  );
}

/* ── Payment ─────────────────────────────────── */
function PaymentDetails({ data }: { data: any }) {
  const STATUS: Record<string, string> = {
    succeeded: "badge-jade",
    failed:    "badge-coral",
    pending:   "badge-amber",
  };

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xs font-mono text-ink-500 uppercase">Amount</p>
            <p className="font-mono text-3xl font-black text-ink-0 mt-1">{formatINR(data.amount)}</p>
          </div>
          <span className={`${STATUS[data.status] ?? "badge-neutral"} text-2xs font-mono font-bold px-2 py-0.5 rounded-md capitalize`}>
            {data.status}
          </span>
        </div>
      </div>

      {data.failure_reason && (
        <div className="rounded-2xl border border-coral-500/25 bg-coral-500/8 px-4 py-3 flex items-start gap-2.5">
          <AlertCircle size={14} className="text-coral-400 shrink-0 mt-0.5"/>
          <div>
            <p className="text-xs font-bold text-coral-300">Failure Reason</p>
            <p className="text-xs text-coral-400/80 mt-0.5 capitalize">{data.failure_reason.replaceAll("_"," ")}</p>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl px-4 py-2">
        <Field label="Payment Method" value={<span className="capitalize">{data.payment_method?.replaceAll("_"," ") || "UPI"}</span>}/>
        <Field label="Retry Count"    value={`${data.retry_count} retries`} mono/>
        <Field label="Currency"       value={data.currency || "INR"}/>
        <Field label="Customer ID"    value={<span className="truncate max-w-[160px] block">{data.customer_id}</span>} mono/>
        {data.subscription_id && (
          <Field label="Subscription" value={<span className="truncate max-w-[160px] block">{data.subscription_id}</span>} mono/>
        )}
      </div>
    </div>
  );
}

/* ── Subscription ────────────────────────────── */
function SubscriptionDetails({ data }: { data: any }) {
  const STATUS: Record<string, string> = {
    active:   "badge-jade",
    canceled: "badge-neutral",
    past_due: "badge-coral",
  };

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xs font-mono text-ink-500 uppercase">Plan</p>
            <p className="text-lg font-black text-ink-0 capitalize mt-1">{data.plan_name}</p>
          </div>
          <span className={`${STATUS[data.status] ?? "badge-neutral"} text-2xs font-mono font-bold px-2 py-0.5 rounded-md capitalize`}>
            {data.status.replace("_"," ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xs font-mono text-ink-500 uppercase">Monthly MRR</p>
          <p className="font-mono text-xl font-black stat-glow-jade mt-1">{formatINR(data.mrr)}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xs font-mono text-ink-500 uppercase">Period End</p>
          <p className="text-sm font-black text-ink-0 mt-1">
            {new Date(data.current_period_end).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
          </p>
        </div>
      </div>

      <div className="glass-card rounded-2xl px-4 py-2">
        <Field label="Customer ID" value={<span className="truncate max-w-[180px] block">{data.customer_id}</span>} mono/>
        {data.canceled_at && (
          <Field label="Canceled at" value={new Date(data.canceled_at).toLocaleDateString()}/>
        )}
      </div>
    </div>
  );
}

/* ── Opportunity ─────────────────────────────── */
function OpportunityDetails({ data }: { data: any }) {
  const PRIORITY: Record<string, string> = {
    critical: "badge-coral", high: "badge-amber", medium: "badge-violet", low: "badge-neutral",
  };
  const POLICY: Record<string, string> = {
    auto:             "badge-jade",
    escalated:        "badge-coral",
    approval_required:"badge-amber",
    blocked:          "badge-neutral",
  };

  const probPct  = Math.round(data.recovery_probability * 100);
  const r = 18; const circ = 2 * Math.PI * r;
  const color = probPct >= 70 ? "#34E8A0" : probPct >= 40 ? "#FBC66B" : "#FF8177";

  return (
    <div className="space-y-5">
      {/* Score hero */}
      <div className="glass-card rounded-2xl p-5 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 44 44" className="-rotate-90">
            <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--base-300))" strokeWidth="4"/>
            <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - data.recovery_probability)}/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-black text-ink-0">{probPct}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-2xs font-mono text-ink-500 uppercase">Recovery Probability</p>
          <p className="font-mono text-2xl font-black stat-glow-jade mt-1">
            {formatINR(data.expected_recovery_value)}
          </p>
          <p className="text-2xs text-ink-500 mt-0.5">expected recovery</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`${PRIORITY[data.priority] ?? "badge-neutral"} text-2xs font-mono font-bold px-2.5 py-1 rounded-md capitalize`}>
          {data.priority} priority
        </span>
        <span className={`${POLICY[data.policy_status] ?? "badge-neutral"} text-2xs font-mono font-bold px-2.5 py-1 rounded-md capitalize`}>
          {data.policy_status?.replace("_"," ")}
        </span>
      </div>

      {/* KPI pair */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xs font-mono text-ink-500 uppercase">At Risk</p>
          <p className="font-mono text-lg font-black stat-glow-coral mt-1">{formatINR(data.amount_at_risk)}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xs font-mono text-ink-500 uppercase">Action Status</p>
          <p className="text-sm font-black text-ink-0 capitalize mt-1">{data.action_status}</p>
        </div>
      </div>

      {/* Policy checks */}
      {data.policy_checks?.length > 0 && (
        <div className="space-y-2">
          <p className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={11}/> Policy Checks
          </p>
          <div className="glass-card rounded-2xl px-4 py-2">
            {data.policy_checks.map((chk: any) => (
              <div key={chk.name} className="flex items-center justify-between py-2.5 border-b border-base-border/40 last:border-0">
                <span className="text-xs text-ink-300 capitalize">{chk.name.replace(/_/g," ")}</span>
                <div className="flex items-center gap-1.5">
                  {chk.passed
                    ? <><CheckCircle2 size={13} className="text-jade-400"/><span className="text-jade-400 text-2xs font-bold">Passed</span></>
                    : <><XCircle size={13} className="text-coral-400"/><span className="text-coral-400 text-2xs font-bold">Failed</span></>
                  }
                  {chk.detail && <span className="text-2xs text-ink-500 ml-1">({chk.detail})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supporting evidence */}
      {data.supporting_evidence && Object.keys(data.supporting_evidence).length > 0 && (
        <div className="space-y-2">
          <p className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase size={11}/> Supporting Evidence
          </p>
          <div className="glass-card rounded-2xl px-4 py-2 max-h-36 overflow-y-auto">
            {Object.entries(data.supporting_evidence).map(([k, v]: any) => (
              <div key={k} className="flex items-start justify-between py-2.5 border-b border-base-border/40 last:border-0 gap-3">
                <span className="text-2xs font-mono text-ink-500 capitalize">{k.replace(/_/g," ")}</span>
                <span className="text-2xs text-ink-200 text-right truncate max-w-[180px]">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

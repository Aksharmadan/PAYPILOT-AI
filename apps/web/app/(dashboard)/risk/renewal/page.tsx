import { formatINR } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { Calendar, AlertTriangle, Clock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface RenewalEntry {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  plan_name: string;
  mrr: number;
  current_period_end: string;
  risk_level: "high" | "medium" | "low";
  churn_risk_score: number;
  days_until_renewal: number;
}

async function getRenewalRadar(days = 30): Promise<RenewalEntry[]> {
  try { return apiFetch<RenewalEntry[]>(`/revenue/renewal-radar?days=${days}`); }
  catch { return []; }
}

const RISK_CFG = {
  high:   { badge: "badge-coral", dot: "bg-coral-500 shadow-[0_0_5px_rgba(240,85,76,0.7)]", label: "High Risk" },
  medium: { badge: "badge-amber", dot: "bg-amber-500",  label: "At Risk"  },
  low:    { badge: "badge-jade",  dot: "bg-jade-500",   label: "Stable"   },
};

function DaysBadge({ days }: { days: number }) {
  const cls = days <= 7 ? "badge-coral" : days <= 14 ? "badge-amber" : "badge-neutral";
  return (
    <span className={`${cls} inline-flex items-center gap-1 text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>
      <Clock size={9}/>{days}d
    </span>
  );
}

export default async function RenewalRadarPage() {
  const [all30, all14, all7] = await Promise.all([
    getRenewalRadar(30), getRenewalRadar(14), getRenewalRadar(7),
  ]);

  const highRisk7   = all7.filter(r => r.risk_level === "high").length;
  const totalMRR30  = all30.reduce((s, r) => s + r.mrr, 0);
  const atRiskMRR   = all30.filter(r => r.risk_level !== "low").reduce((s, r) => s + r.mrr, 0);

  const buckets = [
    { label: "Next 7 Days",    sub: "Urgent",   data: all7, urgency: "coral", dotCls: "bg-coral-500 shadow-[0_0_6px_rgba(240,85,76,0.7)]" },
    { label: "8–14 Days",      sub: "Soon",     data: all14.filter(r => r.days_until_renewal > 7), urgency: "amber", dotCls: "bg-amber-500" },
    { label: "15–30 Days",     sub: "Upcoming", data: all30.filter(r => r.days_until_renewal > 14), urgency: "jade", dotCls: "bg-jade-500" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Risk Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Renewal Radar</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            Subscriptions renewing in 30 days — ranked by renewal risk
          </p>
        </div>
        <Link href={`/copilot?q=${encodeURIComponent("Show renewal exposure for the next 7 days")}`}
          className="badge-violet shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
          <Sparkles size={12}/> Ask AI
        </Link>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-surface rounded-2xl p-5 space-y-1.5 card-glow-coral cursor-default">
          <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">Urgent (7d)</p>
          <p className="font-mono text-2xl font-black stat-glow-coral">{highRisk7}</p>
          <p className="text-2xs text-ink-500">high-risk renewals this week</p>
        </div>
        <div className="card-surface rounded-2xl p-5 space-y-1.5 card-glow-amber cursor-default">
          <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">MRR at Risk (30d)</p>
          <p className="font-mono text-2xl font-black stat-glow-amber">{formatINR(atRiskMRR)}</p>
          <p className="text-2xs text-ink-500">medium + high risk</p>
        </div>
        <div className="card-surface rounded-2xl p-5 space-y-1.5 card-glow-jade cursor-default">
          <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">Total MRR (30d)</p>
          <p className="font-mono text-2xl font-black stat-glow-jade">{formatINR(totalMRR30)}</p>
          <p className="text-2xs text-ink-500">renewal horizon</p>
        </div>
      </div>

      {/* ── Renewal horizon visual ── */}
      <section className="card-surface rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-0 flex items-center gap-2">
            <Calendar size={14} className="text-violet-400"/>
            Renewal Horizon
          </h2>
          <span className="text-2xs font-mono text-ink-500">Next 30 days</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {buckets.map(b => (
            <div key={b.label} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${b.dotCls}`}/>
                <span className="text-xs font-bold text-ink-0">{b.label}</span>
                <span className="ml-auto font-mono text-xs text-ink-300">{b.data.length}</span>
              </div>
              <p className={`font-mono text-lg font-black ${
                b.urgency==="coral" ? "text-coral-400" : b.urgency==="amber" ? "text-amber-400" : "text-jade-400"
              }`}>
                {formatINR(b.data.reduce((s,r) => s+r.mrr, 0))}
              </p>
              <p className="text-2xs text-ink-500">{b.sub} · {b.data.filter(r=>r.risk_level!=="low").length} at risk</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bucket tables ── */}
      {buckets.map(b => (
        <section key={b.label} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${b.dotCls}`}/>
            <h2 className="text-sm font-bold text-ink-0">{b.label}</h2>
            <span className="badge-neutral text-2xs font-mono font-bold px-2 py-0.5 rounded-md">{b.data.length}</span>
          </div>

          {b.data.length === 0 ? (
            <div className="card-surface rounded-2xl p-6 text-center text-sm text-ink-400">
              No renewals in this window.
            </div>
          ) : (
            <div className="table-shell">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-border">
                    {["Customer","Plan","MRR","Renews In","Risk","Renewal Date","Action"].map(h => (
                      <th key={h} className={`px-4 py-3 text-2xs font-bold text-ink-500 uppercase tracking-widest ${
                        h==="MRR"||h==="Renewal Date" ? "text-right" : h==="Action" ? "text-right" : "text-left"
                      }`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.data.map(r => {
                    const cfg = RISK_CFG[r.risk_level];
                    return (
                      <tr key={r.id} className="table-row border-b border-base-border/60 last:border-0">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-ink-0">{r.customer_name}</p>
                          <p className="text-2xs text-ink-500">{r.customer_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge-neutral text-2xs font-mono font-bold px-2 py-0.5 rounded-md capitalize">
                            {r.plan_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-black text-jade-300">
                          {formatINR(r.mrr)}
                        </td>
                        <td className="px-4 py-3">
                          <DaysBadge days={r.days_until_renewal}/>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`${cfg.badge} text-2xs font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}/>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-ink-400">
                          {new Date(r.current_period_end).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`?drawerType=customer&drawerId=${r.customer_id}`}
                            className="text-2xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center justify-end gap-1">
                            Profile <ArrowRight size={10}/>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

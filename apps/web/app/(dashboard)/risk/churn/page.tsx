import Link from "next/link";
import { formatINR } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, Users, Sparkles, ChevronRight, ArrowRight } from "lucide-react";

interface ChurnEntry {
  id: string;
  name: string;
  email: string;
  churn_risk_score: number;
  mrr_at_risk: number;
  reasons: string[];
}

async function getChurnRadar(limit = 50): Promise<ChurnEntry[]> {
  try { return apiFetch<ChurnEntry[]>(`/revenue/churn-radar?limit=${limit}`); }
  catch { return []; }
}

const REASON_META: Record<string, { label: string; badge: string }> = {
  high_churn_signal:     { label: "High Churn Signal",  badge: "badge-coral" },
  payment_friction:      { label: "Payment Friction",   badge: "badge-amber" },
  subscription_past_due: { label: "Past Due",           badge: "badge-coral" },
};

function RiskBar({ score }: { score: number }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 70 ? "progress-bar-coral" : pct >= 40 ? "progress-bar-amber" : "progress-bar-jade";
  const cls   = pct >= 70 ? "text-coral-400" : pct >= 40 ? "text-amber-400" : "text-jade-400";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full bg-base-300/50 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }}/>
      </div>
      <span className={`font-mono text-xs font-black w-8 text-right ${cls}`}>{pct}%</span>
    </div>
  );
}

function RiskRing({ score }: { score: number }) {
  const pct    = Math.min(Math.max(score, 0), 1);
  const r      = 18; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color  = pct >= 0.7 ? "#F0554C" : pct >= 0.4 ? "#E8A23D" : "#22C08A";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90 shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--base-300))" strokeWidth="4"/>
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}/>
    </svg>
  );
}

export default async function ChurnRadarPage() {
  const customers      = await getChurnRadar(50);
  const totalMRRAtRisk = customers.reduce((s, c) => s + c.mrr_at_risk, 0);
  const highRisk       = customers.filter(c => c.churn_risk_score >= 0.65);
  const medRisk        = customers.filter(c => c.churn_risk_score >= 0.4 && c.churn_risk_score < 0.65);
  const avgScore       = customers.length > 0
    ? customers.reduce((s, c) => s + c.churn_risk_score, 0) / customers.length : 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Risk Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Churn Radar</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            Customers ranked by churn probability with explainable signal drivers
          </p>
        </div>
        <Link href={`/copilot?q=${encodeURIComponent("Which high value customers are most likely to churn and what should I do?")}`}
          className="badge-violet shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
          <Sparkles size={12}/> Ask AI
        </Link>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "High Risk",     value: String(highRisk.length), sub: "churn score ≥ 65%",  cls: "stat-glow-coral",  badge: "badge-coral" },
          { label: "Medium Risk",   value: String(medRisk.length),  sub: "churn score 40–65%", cls: "stat-glow-amber",  badge: "badge-amber" },
          { label: "MRR at Risk",   value: formatINR(totalMRRAtRisk), sub: "combined exposure", cls: "stat-glow-amber", badge: "badge-amber" },
          { label: "Avg Churn Score", value: `${(avgScore*100).toFixed(0)}%`, sub: "across radar cohort", cls: "text-ink-0", badge: "badge-neutral" },
        ].map(s => (
          <div key={s.label} className="card-surface rounded-2xl p-4 space-y-1.5 cursor-default">
            <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-2xl font-black ${s.cls}`}>{s.value}</p>
            <p className="text-2xs text-ink-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Risk legend ── */}
      <div className="flex items-center gap-5 text-xs">
        {[
          { color: "bg-coral-500", label: "High risk (≥65%)",  glow: "shadow-[0_0_6px_rgba(240,85,76,0.7)]" },
          { color: "bg-amber-500", label: "Medium risk (40–65%)", glow: "" },
          { color: "bg-jade-500",  label: "Low risk (<40%)",   glow: "" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${l.color} ${l.glow}`}/>
            <span className="text-ink-400">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Customer cards / table ── */}
      {customers.length === 0 ? (
        <div className="card-surface rounded-2xl p-12 text-center space-y-2">
          <Users size={24} className="mx-auto text-ink-500"/>
          <p className="text-sm text-ink-400">No at-risk customers found.</p>
        </div>
      ) : (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border">
                  {["Customer","Churn Risk","MRR at Risk","Signal Reasons","Action"].map(h => (
                    <th key={h} className={`px-5 py-3 text-2xs font-bold text-ink-500 uppercase tracking-widest ${h==="Action"||h==="MRR at Risk" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const pct    = Math.round(c.churn_risk_score * 100);
                  const isHigh = pct >= 65;
                  const isMed  = pct >= 40 && pct < 65;
                  return (
                    <tr key={c.id} className="table-row border-b border-base-border/60 last:border-0">
                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <RiskRing score={c.churn_risk_score}/>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`font-mono text-2xs font-black ${isHigh ? "text-coral-400" : isMed ? "text-amber-400" : "text-jade-400"}`}>
                                {c.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ink-0">{c.name}</p>
                            <p className="text-2xs text-ink-500 mt-0.5">{c.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Churn risk */}
                      <td className="px-5 py-4 w-40">
                        <RiskBar score={c.churn_risk_score}/>
                      </td>

                      {/* MRR at risk */}
                      <td className="px-5 py-4 text-right font-mono text-sm font-black text-amber-400">
                        {formatINR(c.mrr_at_risk)}
                      </td>

                      {/* Reasons */}
                      <td className="px-5 py-4">
                        {c.reasons.length === 0 ? (
                          <span className="text-xs text-ink-500">No signals</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {c.reasons.map(r => {
                              const meta = REASON_META[r] ?? { label: r.replace(/_/g, " "), badge: "badge-neutral" };
                              return (
                                <span key={r} className={`${meta.badge} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>
                                  {meta.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`?drawerType=customer&drawerId=${c.id}`}
                            className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                            View Profile <ArrowRight size={11}/>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

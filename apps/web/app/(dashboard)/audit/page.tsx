import Link from "next/link";
import {
  FileText, ShieldCheck, CheckCircle2, XCircle,
  AlertTriangle, Zap, TrendingUp, RefreshCw, Clock,
  ChevronDown, Sparkles,
} from "lucide-react";
import { getAuditDecisions, getAuditEvents } from "@/lib/api";
import { formatINR } from "@/lib/format";

/* ── Types ─────────────────────────────────── */
type AuditEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  correlation_id: string;
  created_at: string;
};

/* ── Helpers ─────────────────────────────────── */
function groupByCorrelation(events: AuditEvent[]): Map<string, AuditEvent[]> {
  const map = new Map<string, AuditEvent[]>();
  for (const e of events) {
    const key = e.correlation_id || e.entity_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  for (const group of map.values()) {
    group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return map;
}

function eventIcon(type: string) {
  if (type.includes("failed") || type.includes("rejected"))  return <XCircle size={12} className="text-coral-400"/>;
  if (type.includes("completed") || type.includes("succeeded") || type.includes("recovered"))
    return <CheckCircle2 size={12} className="text-jade-400"/>;
  if (type.includes("created"))  return <TrendingUp size={12} className="text-violet-400"/>;
  if (type.includes("approved")) return <Zap size={12} className="text-jade-400"/>;
  if (type.includes("experiment")) return <RefreshCw size={12} className="text-amber-400"/>;
  return <FileText size={12} className="text-ink-400"/>;
}

function eventBadge(type: string) {
  if (type.includes("failed") || type.includes("rejected"))  return "border-coral-500/20 bg-coral-500/8";
  if (type.includes("completed") || type.includes("succeeded") || type.includes("recovered")) return "border-jade-500/20 bg-jade-500/8";
  if (type.includes("created"))  return "border-violet-500/20 bg-violet-500/8";
  if (type.includes("approved")) return "border-jade-500/20 bg-jade-500/8";
  return "border-base-border bg-base-200/50";
}

function humanName(type: string): string {
  const map: Record<string, string> = {
    "recovery.opportunity_created": "Opportunity created",
    "recovery.action_approved":     "Recovery approved",
    "recovery.action_rejected":     "Recovery rejected",
    "recovery.action_completed":    "Payment recovered",
    "recovery.action_failed":       "Recovery failed",
    "experiment_started":           "Experiment started",
    "experiment_control_resolved":  "Experiment resolved",
    "payment.failed":               "Payment failed",
  };
  return map[type] || type.replaceAll(".", " · ").replaceAll("_", " ");
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Page ─────────────────────────────────── */
export default async function AuditPage() {
  const [events, decisions] = await Promise.all([getAuditEvents(200), getAuditDecisions(50)]);

  const grouped = groupByCorrelation(events.items);
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    const la = a[1][a[1].length - 1].created_at;
    const lb = b[1][b[1].length - 1].created_at;
    return new Date(lb).getTime() - new Date(la).getTime();
  });

  const recoveredSessions = sortedGroups.filter(([, evts]) =>
    evts.some(e => e.event_type.includes("completed") || e.event_type.includes("recovered"))
  ).length;
  const failedSessions = sortedGroups.filter(([, evts]) =>
    evts.some(e => e.event_type === "recovery.action_failed")
  ).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Traceability</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Audit Trail</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            Every recovery decision, execution, and outcome — grouped by recovery session
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="badge-jade text-2xs font-mono font-bold px-3 py-1.5 rounded-xl">{events.total} events</span>
          <span className="badge-violet text-2xs font-mono font-bold px-3 py-1.5 rounded-xl">{decisions.total} decisions</span>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Recovery Sessions", value: String(sortedGroups.length), cls: "text-ink-0" },
          { label: "Recovered",         value: String(recoveredSessions),   cls: "stat-glow-jade" },
          { label: "Failed",            value: String(failedSessions),      cls: "stat-glow-coral" },
          { label: "Decisions Logged",  value: String(decisions.total),     cls: "stat-glow-violet" },
        ].map(s => (
          <div key={s.label} className="card-surface rounded-2xl p-4 space-y-1.5 cursor-default">
            <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-mono text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">

        {/* ── Recovery timelines ── */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 pb-2">
            <Clock size={13} className="text-violet-400"/>
            <h2 className="text-sm font-bold text-ink-0">Recovery Timelines</h2>
            <span className="text-2xs font-mono text-ink-500 ml-auto">{sortedGroups.length} sessions</span>
          </div>

          {sortedGroups.length === 0 && (
            <div className="card-surface rounded-2xl p-12 text-center space-y-2">
              <FileText size={24} className="mx-auto text-ink-500"/>
              <p className="text-sm text-ink-400">No audit events yet.</p>
              <p className="text-xs text-ink-500">Execute a recovery or run the demo.</p>
            </div>
          )}

          <div className="space-y-2">
            {sortedGroups.map(([correlationId, evts]) => {
              const first       = evts[0];
              const last        = evts[evts.length - 1];
              const isRecovered = evts.some(e => e.event_type.includes("completed") || e.event_type.includes("recovered"));
              const isFailed    = evts.some(e => e.event_type === "recovery.action_failed");
              const isDemo      = evts.some(e => (e.payload as Record<string,unknown>)?.simulation === true);
              const oppId       = first.entity_type === "recovery_opportunity" ? first.entity_id : null;

              return (
                <details key={correlationId}
                  className="group card-surface rounded-2xl overflow-hidden transition-all">
                  <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none list-none hover:bg-base-200/50 transition-colors">
                    {/* Status dot */}
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      isRecovered ? "bg-jade-400 shadow-[0_0_6px_rgba(34,232,160,0.7)]" :
                      isFailed    ? "bg-coral-500" : "bg-amber-500"
                    }`}/>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-ink-0 truncate">{humanName(first.event_type)}</p>
                        {isDemo && (
                          <span className="badge-amber text-2xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0">DEMO</span>
                        )}
                      </div>
                      <p className="text-2xs font-mono text-ink-500 mt-0.5 truncate">{correlationId.slice(0, 20)}…</p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        isRecovered ? "badge-jade" : isFailed ? "badge-coral" : "badge-amber"
                      }`}>
                        {isRecovered ? "RECOVERED" : isFailed ? "FAILED" : "PENDING"}
                      </span>
                      <span className="text-2xs text-ink-500 font-mono whitespace-nowrap">{timeAgo(last.created_at)}</span>
                      <span className="text-2xs text-ink-500 font-mono">{evts.length} steps</span>
                      <ChevronDown size={13} className="text-ink-500 transition-transform duration-240 group-open:rotate-180"/>
                    </div>
                  </summary>

                  {/* Timeline */}
                  <div className="border-t border-base-border/60 px-5 py-4 space-y-0 bg-base-50/40">
                    {evts.map((evt, i) => (
                      <div key={evt.id} className="flex gap-3">
                        {/* Spine */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center border ${eventBadge(evt.event_type)}`}>
                            {eventIcon(evt.event_type)}
                          </div>
                          {i < evts.length - 1 && (
                            <div className="w-px flex-1 min-h-[20px] my-1 bg-base-border/60"/>
                          )}
                        </div>

                        {/* Content */}
                        <div className="pb-3 flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-ink-0">{humanName(evt.event_type)}</p>
                              <p className="text-2xs font-mono text-ink-500 mt-0.5 truncate">{evt.idempotency_key}</p>
                            </div>
                            <p className="text-2xs font-mono text-ink-500 shrink-0 whitespace-nowrap">
                              {new Date(evt.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </p>
                          </div>
                          {/* Payload tags */}
                          {evt.payload && Object.keys(evt.payload).length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {Object.entries(evt.payload)
                                .filter(([k]) => !["id","policy_checks","reason_codes","supporting_evidence"].includes(k))
                                .slice(0, 4)
                                .map(([k, v]) => (
                                  <span key={k}
                                    className="badge-neutral text-2xs font-mono px-1.5 py-0.5 rounded-md">
                                    {k}: {String(v).slice(0, 28)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {oppId && (
                      <div className="mt-2 pt-3 border-t border-base-border/40">
                        <Link href={`/revenue/opportunities?id=${oppId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">
                          <TrendingUp size={12}/> Open in Recovery Queue
                        </Link>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* ── Approval decisions sidebar ── */}
        <aside className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <ShieldCheck size={13} className="text-jade-400"/>
            <h2 className="text-sm font-bold text-ink-0">Approval Decisions</h2>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {decisions.items.length === 0 ? (
              <div className="card-surface rounded-2xl p-6 text-center">
                <p className="text-xs text-ink-400">No decisions yet.</p>
              </div>
            ) : (
              decisions.items.map(d => (
                <div key={d.id} className="card-surface rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-2xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      d.decision === "approve" ? "badge-jade" : "badge-coral"
                    }`}>
                      {d.decision === "approve" ? <CheckCircle2 size={10}/> : <XCircle size={10}/>}
                      {d.decision.toUpperCase()}
                    </span>
                    <span className="text-2xs text-ink-500 font-mono">{timeAgo(d.created_at)}</span>
                  </div>
                  <p className="text-xs font-semibold text-ink-0">{d.merchant_email}</p>
                  <p className="font-mono text-2xs text-ink-500 truncate">{d.opportunity_id.slice(0, 24)}…</p>
                  {d.outcome && (
                    <span className={`text-2xs font-mono font-bold ${d.outcome === "recovered" ? "text-jade-400" : "text-ink-400"}`}>
                      Outcome: {d.outcome}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

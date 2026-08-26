import { FileText, ShieldCheck } from "lucide-react";
import { getAuditDecisions, getAuditEvents } from "@/lib/api";

export default async function AuditPage() {
  const [events, decisions] = await Promise.all([getAuditEvents(80), getAuditDecisions(40)]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-ink-300">Traceability</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-0">Audit Trail</h1>
        </div>
        <span className="rounded-full border border-jade-500/20 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
          {events.total} events · {decisions.total} decisions
        </span>
      </div>

      <section className="overflow-hidden rounded-lg border border-base-border bg-base-100 shadow-card">
        <div className="border-b border-base-border px-4 py-3">
          <h2 className="text-sm font-medium text-ink-0">Recovery decisions</h2>
          <p className="mt-1 text-xs text-ink-500">Who approved or rejected an opportunity, and when.</p>
        </div>
        <div className="grid grid-cols-[1fr_1fr_0.8fr_1.2fr] border-b border-base-border bg-base-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">
          <span>Merchant</span>
          <span>Opportunity</span>
          <span>Decision</span>
          <span>Time</span>
        </div>
        <div className="divide-y divide-base-border">
          {decisions.items.map((d) => (
            <div key={d.id} className="grid grid-cols-[1fr_1fr_0.8fr_1.2fr] items-center px-4 py-4 text-sm">
              <span className="text-ink-0">{d.merchant_email}</span>
              <span className="truncate font-mono text-xs text-ink-300">{d.opportunity_id}</span>
              <span className={d.decision === "approve" ? "text-jade-400" : "text-coral-400"}>{d.decision}</span>
              <span className="text-ink-300">{new Date(d.created_at).toLocaleString()}</span>
            </div>
          ))}
          {decisions.items.length === 0 && (
            <div className="p-8 text-sm text-ink-300">No approve/reject decisions recorded yet.</div>
          )}
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-base-border bg-base-100 shadow-card">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr] border-b border-base-border bg-base-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">
          <span>Event</span>
          <span>Entity</span>
          <span>Correlation</span>
          <span>Time</span>
        </div>
        <div className="divide-y divide-base-border">
          {events.items.map((event) => (
            <div key={event.id} className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr] items-center px-4 py-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-base-border bg-base-50 p-2 text-jade-400">
                  {event.event_type.includes("failed") ? <FileText size={15} /> : <ShieldCheck size={15} />}
                </div>
                <span className="text-ink-0">{event.event_type}</span>
              </div>
              <span className="text-ink-300">{event.entity_type}</span>
              <span className="truncate font-mono text-xs text-ink-300">{event.correlation_id}</span>
              <span className="text-ink-300">{new Date(event.created_at).toLocaleString()}</span>
            </div>
          ))}
          {events.items.length === 0 && <div className="p-8 text-sm text-ink-300">No audit events yet.</div>}
        </div>
      </div>
    </div>
  );
}

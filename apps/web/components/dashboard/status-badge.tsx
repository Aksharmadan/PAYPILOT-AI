/* Premium status badge — maps status strings to the badge design system */

const STATUS_BADGE: Record<string, string> = {
  /* Payment statuses */
  succeeded:     "badge-jade",
  success:       "badge-jade",
  completed:     "badge-jade",
  recovered:     "badge-jade",
  active:        "badge-jade",
  approved:      "badge-jade",
  high:          "badge-jade",
  /* Warning / pending */
  pending:       "badge-amber",
  executing:     "badge-amber",
  past_due:      "badge-amber",
  trialing:      "badge-amber",
  medium:        "badge-amber",
  approval_required: "badge-amber",
  escalated:     "badge-amber",
  queued:        "badge-amber",
  /* Error */
  failed:        "badge-coral",
  canceled:      "badge-coral",
  rejected:      "badge-coral",
  blocked:       "badge-coral",
  low:           "badge-coral",
  /* Neutral */
  draft:         "badge-neutral",
  open:          "badge-neutral",
  unknown:       "badge-neutral",
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const badge = STATUS_BADGE[status?.toLowerCase()] ?? "badge-neutral";
  const label = status?.replaceAll("_", " ") ?? "—";
  return (
    <span className={`${badge} text-2xs font-mono font-bold px-2 py-0.5 rounded-md capitalize inline-flex items-center ${className}`}>
      {label}
    </span>
  );
}

/* Dot-only variant — for compact inline use */
export function StatusDot({ status }: { status: string }) {
  const COLOR: Record<string, string> = {
    succeeded: "bg-jade-400 shadow-[0_0_5px_rgba(34,232,160,0.6)]",
    success:   "bg-jade-400 shadow-[0_0_5px_rgba(34,232,160,0.6)]",
    active:    "bg-jade-400 shadow-[0_0_5px_rgba(34,232,160,0.6)]",
    completed: "bg-jade-400",
    recovered: "bg-jade-400",
    pending:   "bg-amber-500",
    executing: "bg-amber-500",
    past_due:  "bg-amber-500",
    failed:    "bg-coral-500",
    canceled:  "bg-coral-500",
    rejected:  "bg-coral-500",
  };
  const cls = COLOR[status?.toLowerCase()] ?? "bg-ink-500";
  return <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cls}`}/>;
}

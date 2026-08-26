const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-jade-500/10 text-jade-400 border-jade-500/20",
  active: "bg-jade-500/10 text-jade-400 border-jade-500/20",
  failed: "bg-coral-500/10 text-coral-400 border-coral-500/20",
  canceled: "bg-coral-500/10 text-coral-400 border-coral-500/20",
  past_due: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  trialing: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  high: "bg-jade-500/10 text-jade-400 border-jade-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-coral-500/10 text-coral-400 border-coral-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-ink-500/10 text-ink-300 border-ink-500/20";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${style}`}>
      {status.replace("_", " ")}
    </span>
  );
}

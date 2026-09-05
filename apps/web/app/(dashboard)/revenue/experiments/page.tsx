import { revalidatePath } from "next/cache";
import Link from "next/link";
import { FlaskConical, CheckCircle2, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import {
  createExperiment, getExperimentResults, getExperiments,
  startExperiment, type Experiment, type ExperimentResults,
} from "@/lib/api";
import { formatINR } from "@/lib/format";

/* ── Server action ── */
async function createAction(formData: FormData) {
  "use server";
  try {
    const name              = String(formData.get("name") || "Untitled experiment");
    const population_filter = String(formData.get("population_filter") || "failed_payments");
    const split_ratio       = Number(formData.get("split_ratio") || 0.5);
    const exp = await createExperiment({ name, population_filter, split_ratio });
    await startExperiment(exp.id).catch(() => null);
  } catch (_) {}
  revalidatePath("/revenue/experiments");
}

/* ── Comparison bar ── */
function ComparisonBar({ results }: { results: ExperimentResults }) {
  const ctrlPct = results.control.recovery_rate * 100;
  const treatPct = results.treatment.recovery_rate * 100;
  const max = Math.max(ctrlPct, treatPct, 1);
  const hasLift = results.lift_pp >= 0;
  const relLift = ctrlPct > 0 ? ((treatPct - ctrlPct) / ctrlPct * 100).toFixed(1) : "—";

  return (
    <section className="card-surface rounded-2xl p-6 space-y-5 border border-violet-500/15">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="badge-violet text-2xs font-mono font-bold px-2 py-0.5 rounded-md">ACTIVE EXPERIMENT</span>
          <h2 className="text-lg font-bold text-ink-0 mt-2">{results.name}</h2>
          <p className="text-sm text-ink-400 mt-0.5">Comparing control vs. AI-assisted recovery treatment</p>
        </div>
        <span className={`text-2xl font-black font-mono ${hasLift ? "stat-glow-jade" : "stat-glow-coral"}`}>
          {hasLift ? "+" : ""}{results.lift_pp.toFixed(1)}pp
        </span>
      </div>

      {/* Bars */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink-400"/>
              <span className="text-ink-400">Control (n={results.control.n})</span>
            </div>
            <span className="font-mono font-bold text-ink-0">{ctrlPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-base-300/60 overflow-hidden">
            <div className="h-full rounded-full bg-ink-400/70" style={{ width: `${(ctrlPct / max) * 100}%` }}/>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-jade-500"/>
              <span className="text-ink-400">Treatment / AI (n={results.treatment.n})</span>
            </div>
            <span className="font-mono font-bold text-jade-300">{treatPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-base-300/60 overflow-hidden">
            <div className="h-full rounded-full progress-bar-jade" style={{ width: `${(treatPct / max) * 100}%` }}/>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 pt-2 border-t border-base-border/60">
        {[
          { label: "Control Rate",         value: `${ctrlPct.toFixed(1)}%`,             cls: "text-ink-0" },
          { label: "Treatment Rate",       value: `${treatPct.toFixed(1)}%`,            cls: "text-jade-300" },
          { label: "Relative Lift",        value: `+${relLift}%`,                       cls: "stat-glow-jade" },
          { label: "Incremental Recovered", value: formatINR(results.incremental_recovered), cls: "text-jade-300" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-3 text-center">
            <p className="text-2xs text-ink-500 font-mono uppercase">{s.label}</p>
            <p className={`font-mono text-lg font-black mt-1 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* What was tested / what changed */}
      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        {[
          { label: "What was tested",  text: "Control group received no PayPilot intervention. Treatment group went through full recovery policy and retry engine." },
          { label: "What happened",    text: `Treatment group recovered ${treatPct.toFixed(1)}% vs ${ctrlPct.toFixed(1)}% baseline — a ${results.lift_pp.toFixed(1)}pp absolute lift.` },
          { label: "Why it matters",   text: `${formatINR(results.incremental_recovered)} in incremental revenue was recovered that would otherwise have been lost without PayPilot's intervention.` },
        ].map(b => (
          <div key={b.label} className="glass-card rounded-xl p-4 space-y-1.5">
            <p className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider">{b.label}</p>
            <p className="text-ink-300 leading-relaxed">{b.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Experiment list row ── */
function ExpRow({ exp }: { exp: Experiment }) {
  const statusCls = exp.status === "running" ? "badge-jade" : exp.status === "completed" ? "badge-neutral" : "badge-amber";
  return (
    <Link href={`/revenue/experiments?id=${exp.id}`}
      className="table-row flex items-center justify-between px-5 py-3.5 hover:bg-base-200/50 transition-colors border-b border-base-border/60 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink-0 truncate">{exp.name}</p>
        <p className="text-2xs text-ink-500 capitalize mt-0.5">{exp.population_filter.replaceAll("_", " ")}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-2xs text-ink-400">{Math.round(exp.split_ratio * 100)}% treat</span>
        <span className={`${statusCls} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>{exp.status}</span>
        <ArrowRight size={12} className="text-ink-500"/>
      </div>
    </Link>
  );
}

/* ── Page ── */
export default async function ExperimentsPage({
  searchParams,
}: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const list = await getExperiments();
  const selected = id
    ? list.items.find(e => e.id === id) ?? list.items[0]
    : list.items[0];
  const results = selected && selected.status !== "draft"
    ? await getExperimentResults(selected.id)
    : null;

  const running   = list.items.filter(e => e.status === "running").length;
  const completed = list.items.filter(e => e.status === "completed").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Strategy Laboratory</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Experiments</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            Controlled A/B tests measuring recovery strategy lift
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="badge-jade text-2xs font-mono font-bold px-3 py-1.5 rounded-xl">{running} running</span>
          <span className="badge-neutral text-2xs font-mono font-bold px-3 py-1.5 rounded-xl">{completed} completed</span>
        </div>
      </div>

      {/* ── Active experiment result ── */}
      {results && <ComparisonBar results={results}/>}

      {/* ── List + New form ── */}
      <div className="grid grid-cols-[1fr_340px] gap-4">

        {/* Experiments list */}
        <section className="table-shell">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-base-border bg-base-50/60">
            <FlaskConical size={13} className="text-violet-400"/>
            <h2 className="text-xs font-bold text-ink-0 uppercase tracking-wider">All Experiments</h2>
            <span className="badge-neutral text-2xs font-mono font-bold px-2 py-0.5 rounded-md ml-auto">{list.total}</span>
          </div>
          <div>
            {list.items.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-400">
                No experiments yet. Create one to measure lift.
              </div>
            ) : (
              list.items.map(exp => <ExpRow key={exp.id} exp={exp}/>)
            )}
          </div>
        </section>

        {/* New experiment form */}
        <form action={createAction}
          className="card-surface rounded-2xl p-5 space-y-4 border border-violet-500/15 self-start">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <FlaskConical size={14} className="text-violet-400"/>
            </div>
            <h2 className="text-sm font-bold text-ink-0">New Experiment</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider block mb-1.5">
                Experiment Name
              </label>
              <input name="name" required defaultValue="Recovery lift test"
                className="w-full rounded-xl border border-base-border bg-base-50 px-4 py-2.5 text-xs text-ink-0 outline-none focus:border-violet-500/60 transition-colors"/>
            </div>
            <div>
              <label className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider block mb-1.5">
                Population
              </label>
              <select name="population_filter" defaultValue="failed_payments"
                className="w-full rounded-xl border border-base-border bg-base-50 px-4 py-2.5 text-xs text-ink-0 outline-none focus:border-violet-500/60 transition-colors">
                <option value="failed_payments">Failed payments</option>
                <option value="abandoned_checkouts">Abandoned checkouts</option>
                <option value="past_due_subscriptions">Past-due subscriptions</option>
                <option value="all">All sources</option>
              </select>
            </div>
            <div>
              <label className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider block mb-1.5">
                Treatment split (0.05–0.95)
              </label>
              <input name="split_ratio" type="number" step="0.05" min="0.05" max="0.95" defaultValue="0.5"
                className="w-full rounded-xl border border-base-border bg-base-50 px-4 py-2.5 text-xs text-ink-0 outline-none focus:border-violet-500/60 transition-colors"/>
            </div>
          </div>

          <button type="submit"
            className="btn-glow-jade w-full rounded-xl bg-jade-500 py-2.5 text-xs font-bold text-base-0 transition hover:bg-jade-400">
            Create & Run Experiment
          </button>

          <div className="space-y-2 pt-1 border-t border-base-border/60 text-2xs text-ink-500 leading-relaxed">
            <p>Control receives no recovery action. Treatment goes through the full policy engine and recovery flow.</p>
            <p>Results are measured by recovery rate difference (lift in percentage points).</p>
          </div>
        </form>
      </div>
    </div>
  );
}

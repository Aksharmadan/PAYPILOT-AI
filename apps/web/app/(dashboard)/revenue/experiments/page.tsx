import { revalidatePath } from "next/cache";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import {
  createExperiment,
  getExperimentResults,
  getExperiments,
  startExperiment,
  type Experiment,
  type ExperimentResults,
} from "@/lib/api";
import { formatINR } from "@/lib/format";

async function createAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "Untitled experiment");
  const population_filter = String(formData.get("population_filter") || "failed_payments");
  const split_ratio = Number(formData.get("split_ratio") || 0.5);
  const exp = await createExperiment({ name, population_filter, split_ratio });
  await startExperiment(exp.id);
  revalidatePath("/revenue/experiments");
}

function ComparisonBar({ results }: { results: ExperimentResults }) {
  const controlPct = results.control.recovery_rate * 100;
  const treatmentPct = results.treatment.recovery_rate * 100;
  const max = Math.max(controlPct, treatmentPct, 1);

  return (
    <div className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-ink-300">Control vs treatment</p>
          <h2 className="mt-1 text-lg font-medium text-ink-0">{results.name}</h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            results.lift_pp >= 0
              ? "border-jade-500/20 bg-jade-500/10 text-jade-400"
              : "border-coral-500/20 bg-coral-500/10 text-coral-400"
          }`}
        >
          {results.lift_pp >= 0 ? "+" : ""}
          {results.lift_pp.toFixed(1)}pp lift
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink-300">
            <span>Control ({results.control.n})</span>
            <span>{controlPct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-base-200">
            <div className="h-full bg-ink-500" style={{ width: `${(controlPct / max) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink-300">
            <span>Treatment / AI ({results.treatment.n})</span>
            <span className="text-jade-400">{treatmentPct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-base-200">
            <div className="h-full bg-jade-500" style={{ width: `${(treatmentPct / max) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-base-border pt-4">
        <div>
          <p className="text-xs text-ink-500">Control rate</p>
          <p className="mt-1 font-mono text-lg text-ink-0">{controlPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-ink-500">Treatment rate</p>
          <p className="mt-1 font-mono text-lg text-jade-400">{treatmentPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-ink-500">Incremental recovered</p>
          <p className="mt-1 font-mono text-lg text-ink-0">{formatINR(results.incremental_recovered)}</p>
        </div>
      </div>
    </div>
  );
}

function ExperimentList({ items }: { items: Experiment[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-base-border bg-base-100 shadow-card">
      <div className="grid grid-cols-[1.4fr_1fr_0.7fr_0.7fr] border-b border-base-border bg-base-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">
        <span>Experiment</span>
        <span>Population</span>
        <span>Split</span>
        <span>Status</span>
      </div>
      <div className="divide-y divide-base-border">
        {items.map((exp) => (
          <Link
            key={exp.id}
            href={`/revenue/experiments?id=${exp.id}`}
            className="grid grid-cols-[1.4fr_1fr_0.7fr_0.7fr] items-center px-4 py-4 text-sm transition hover:bg-base-50"
          >
            <span className="text-ink-0">{exp.name}</span>
            <span className="text-ink-300">{exp.population_filter.replaceAll("_", " ")}</span>
            <span className="font-mono text-ink-300">{Math.round(exp.split_ratio * 100)}% treat</span>
            <span
              className={
                exp.status === "running"
                  ? "text-jade-400"
                  : exp.status === "completed"
                    ? "text-ink-300"
                    : "text-amber-400"
              }
            >
              {exp.status}
            </span>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="p-8 text-sm text-ink-300">No experiments yet. Start one below.</div>
        )}
      </div>
    </div>
  );
}

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const list = await getExperiments();
  const selected = id
    ? list.items.find((e) => e.id === id) ?? list.items[0]
    : list.items[0];
  const results = selected && selected.status !== "draft" ? await getExperimentResults(selected.id) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-ink-300">Evaluation</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-0">Revenue Experiments</h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-base-border bg-base-100 px-3 py-1 text-xs text-ink-300">
          <FlaskConical size={13} />
          {list.total} experiments
        </span>
      </div>

      {results && <ComparisonBar results={results} />}

      <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
        <ExperimentList items={list.items} />

        <form action={createAction} className="space-y-4 rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <h2 className="text-sm font-medium text-ink-0">Start new experiment</h2>
          <label className="block">
            <span className="text-xs text-ink-500">Name</span>
            <input
              name="name"
              required
              defaultValue="Recovery lift test"
              className="mt-2 w-full rounded-lg border border-base-border bg-base-50 px-3 py-2.5 text-sm text-ink-0 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Population</span>
            <select
              name="population_filter"
              className="mt-2 w-full rounded-lg border border-base-border bg-base-50 px-3 py-2.5 text-sm text-ink-0 outline-none"
              defaultValue="failed_payments"
            >
              <option value="failed_payments">Failed payments</option>
              <option value="abandoned_checkouts">Abandoned checkouts</option>
              <option value="past_due_subscriptions">Past-due subscriptions</option>
              <option value="all">All sources</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Treatment split (0.05–0.95)</span>
            <input
              name="split_ratio"
              type="number"
              step="0.05"
              min="0.05"
              max="0.95"
              defaultValue="0.5"
              className="mt-2 w-full rounded-lg border border-base-border bg-base-50 px-3 py-2.5 text-sm text-ink-0 outline-none"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-jade-500 px-4 py-2.5 text-sm font-medium text-base-0 transition hover:bg-jade-400"
          >
            Create & run
          </button>
          <p className="text-xs leading-5 text-ink-500">
            Control receives no recovery action. Treatment runs the normal policy engine and recovery flow against seeded opportunities.
          </p>
        </form>
      </div>
    </div>
  );
}

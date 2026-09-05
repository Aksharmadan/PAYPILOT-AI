"use client";

import { useState, useEffect } from "react";
import {
  Zap, ShieldAlert, Sliders, GitFork, CheckCircle2,
  Plus, Trash, PlayCircle, Loader2, ArrowDown,
  AlertCircle,
} from "lucide-react";
import { formatINR } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

/* ── Constants ───────────────────────────────── */
const POLICY_LABELS: Record<string, string> = {
  auto:             "Auto-Retry",
  approval_required:"Approval Req.",
  escalated:        "Escalated",
  blocked:          "Blocked",
};
const POLICY_BADGE: Record<string, string> = {
  auto:             "badge-jade",
  approval_required:"badge-amber",
  escalated:        "badge-coral",
  blocked:          "badge-neutral",
};

const INITIAL_NODES = [
  { id: "1", type: "trigger",  title: "Trigger: Failed Payment",          desc: "Triggered on failed credit card / UPI transactions" },
  { id: "2", type: "decision", title: "Decision: Transaction Amount",      desc: "Is amount ≤ ₹25,000?" },
  { id: "3", type: "action",   title: "Action: Auto-Retry via PayPilot",   desc: "Initiate smart retry within 30 min window" },
  { id: "4", type: "action",   title: "Action: Escalate to Support",       desc: "Assign recovery ticket to high-priority agents" },
  { id: "5", type: "action",   title: "Action: WhatsApp Recovery Flow",    desc: "Send personalised link with checkout discount" },
];

const NODE_BADGE: Record<string, string> = {
  trigger:  "badge-jade",
  decision: "badge-amber",
  action:   "badge-violet",
};
const NODE_DOT: Record<string, string> = {
  trigger:  "bg-jade-500",
  decision: "bg-amber-500",
  action:   "bg-violet-500",
};

/* ── Component ────────────────────────────────── */
export default function AutomationPage() {
  const [tab,          setTab]          = useState<"queues"|"simulator"|"playbook">("queues");
  const [opps,         setOpps]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [simParams,    setSimParams]    = useState({ max_retries: 3, auto_max_amount: 5000, min_confidence_for_auto: 0.70, min_retry_interval_minutes: 30 });
  const [simResult,    setSimResult]    = useState<any>(null);
  const [simulating,   setSimulating]   = useState(false);
  const [nodes,        setNodes]        = useState(INITIAL_NODES);

  useEffect(() => {
    fetch("/api/proxy?path=" + encodeURIComponent("/opportunities?limit=100"))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOpps(d.items ?? []); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSimulate() {
    setSimulating(true); setSimResult(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simParams),
      });
      if (res.ok) setSimResult(await res.json());
    } catch (_) {}
    finally { setSimulating(false); }
  }

  const grouped = opps.reduce<Record<string, any[]>>((acc, item) => {
    acc[item.policy_status] = acc[item.policy_status] ?? [];
    acc[item.policy_status].push(item);
    return acc;
  }, {});

  const tabs = [
    { id: "queues",    label: "Queue Audit",        icon: Zap },
    { id: "simulator", label: "What-If Simulator",  icon: Sliders },
    { id: "playbook",  label: "Playbook Builder",   icon: GitFork },
  ] as const;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-8">

      {/* ── Header + tabs ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-500">Policy Engine</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-0 mt-1">Automation</h1>
        </div>
        <div className="flex rounded-2xl border border-base-border bg-base-100/60 p-1 gap-0.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-160 ${
                tab === t.id
                  ? "bg-base-200 text-ink-0 shadow-sm border border-base-border"
                  : "text-ink-500 hover:text-ink-300"
              }`}>
              <t.icon size={13}/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pipeline legend (always visible) ── */}
      <div className="card-surface rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-bold text-ink-0">Recovery Policy Flow</h2>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {[
            { label: "TRIGGER",   value: "payment.failed",            badge: "badge-coral" },
            { label: "CONDITION", value: "recovery_prob > 70%",       badge: "badge-violet" },
            { label: "POLICY",    value: "retries < 3 · amt ≤ ₹25k", badge: "badge-amber" },
            { label: "ACTION",    value: "auto_retry → backup PSP",   badge: "badge-jade" },
            { label: "OUTCOME",   value: "audit_log + lift_record",   badge: "badge-neutral" },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center shrink-0">
              <div className="glass-card rounded-2xl px-4 py-3 min-w-[140px]">
                <p className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider">{step.label}</p>
                <p className={`${step.badge} text-2xs font-mono font-bold px-2 py-0.5 rounded-md mt-1.5 inline-block`}>
                  {step.value}
                </p>
              </div>
              {i < arr.length - 1 && (
                <div className="w-8 flex items-center justify-center shrink-0">
                  <div className="h-px flex-1 bg-base-border/80"/>
                  <span className="text-ink-500 text-xs mx-1">→</span>
                  <div className="h-px flex-1 bg-base-border/80"/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════════ TAB 1: QUEUES ══════════════════ */}
        {tab === "queues" && (
          <motion.div key="queues"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="space-y-4">

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(POLICY_LABELS).map(([key, label]) => {
                const rows   = grouped[key] ?? [];
                const amount = rows.reduce((sum, r) => sum + r.expected_recovery_value, 0);
                return (
                  <div key={key} className="card-surface rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`${POLICY_BADGE[key]} text-2xs font-mono font-bold px-2 py-0.5 rounded-md`}>
                        {label}
                      </span>
                      {key === "auto" ? <Zap size={13} className="text-jade-400"/> : <ShieldAlert size={13} className="text-ink-500"/>}
                    </div>
                    <p className="font-mono text-3xl font-black text-ink-0">
                      {loading ? "…" : rows.length}
                    </p>
                    <p className="text-2xs text-ink-500">{formatINR(amount)} expected</p>
                  </div>
                );
              })}
            </div>

            {/* Queue columns */}
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="animate-spin text-violet-400" size={20}/>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(POLICY_LABELS).slice(0, 3).map(([key, label]) => (
                  <section key={key} className="card-surface rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                      <h2 className="text-xs font-bold text-ink-0">{label}</h2>
                      <span className="badge-neutral text-2xs font-mono font-bold px-2 py-0.5 rounded-md">
                        {(grouped[key] ?? []).length}
                      </span>
                    </div>
                    <div className="divide-y divide-base-border/60 max-h-[400px] overflow-y-auto">
                      {(grouped[key] ?? []).slice(0, 8).map(item => (
                        <div key={item.id} className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-ink-0 truncate">
                                {item.customer_name ?? "Guest"}
                              </p>
                              <p className="text-2xs text-ink-500 capitalize mt-0.5">
                                {item.recommended_intervention.replaceAll("_"," ")}
                              </p>
                            </div>
                            <span className="font-mono text-xs font-black text-jade-300 shrink-0">
                              {formatINR(item.expected_recovery_value)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-2xs border-t border-base-border/40 pt-2">
                            <span className="flex items-center gap-1 text-ink-500">
                              <CheckCircle2 size={10} className={
                                item.policy_checks.every((c: any) => c.passed) ? "text-jade-400" : "text-coral-400"
                              }/>
                              {item.policy_checks.filter((c: any) => c.passed).length}/{item.policy_checks.length} checks
                            </span>
                            <span className="font-mono text-ink-500">
                              {(item.recovery_probability * 100).toFixed(0)}% prob
                            </span>
                          </div>
                        </div>
                      ))}
                      {(grouped[key] ?? []).length === 0 && (
                        <div className="p-6 text-center text-xs text-ink-500">Empty queue</div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════ TAB 2: SIMULATOR ══════════════════ */}
        {tab === "simulator" && (
          <motion.div key="simulator"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="grid grid-cols-[340px_1fr] gap-4">

            {/* Inputs */}
            <div className="card-surface rounded-2xl p-5 space-y-5 self-start">
              <div className="flex items-center gap-2 border-b border-base-border pb-3">
                <Sliders size={14} className="text-violet-400"/>
                <h2 className="text-sm font-bold text-ink-0">Policy Parameters</h2>
              </div>
              <div className="space-y-5">
                {[
                  { label: "Max retry attempts",     key: "max_retries",               min: 1,    max: 6,    step: 1,    format: (v: number) => `${v} attempts` },
                  { label: "Auto amount threshold",  key: "auto_max_amount",           min: 500,  max: 15000,step: 500,  format: (v: number) => formatINR(v) },
                  { label: "Min auto confidence",    key: "min_confidence_for_auto",   min: 0.40, max: 0.95, step: 0.05, format: (v: number) => `${(v*100).toFixed(0)}%` },
                  { label: "Retry cooldown",         key: "min_retry_interval_minutes",min: 15,   max: 120,  step: 15,   format: (v: number) => `${v} min` },
                ].map(s => (
                  <div key={s.key} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-400">{s.label}</span>
                      <span className="font-mono font-black text-ink-0">{s.format((simParams as any)[s.key])}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={s.step}
                      value={(simParams as any)[s.key]}
                      onChange={e => setSimParams({ ...simParams, [s.key]: parseFloat(e.target.value) })}
                      className="w-full h-1.5 rounded-full bg-base-300 appearance-none cursor-pointer accent-violet-500"/>
                  </div>
                ))}
              </div>
              <button onClick={handleSimulate} disabled={simulating}
                className="btn-glow-violet w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white disabled:opacity-50">
                {simulating ? <><Loader2 size={13} className="animate-spin"/>Running…</> : <><PlayCircle size={13}/>Run Simulation</>}
              </button>
            </div>

            {/* Results */}
            <div className="card-surface rounded-2xl p-5">
              {simResult ? (
                <div className="space-y-5 animate-enter">
                  <div className="flex items-center gap-2 border-b border-base-border pb-3">
                    <h2 className="text-sm font-bold text-ink-0">Simulation Results</h2>
                    <span className="badge-jade text-2xs font-mono font-bold px-2 py-0.5 rounded-md ml-auto">COMPLETE</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Baseline Expected",   value: formatINR(simResult.baseline_expected_recovery),  cls: "text-ink-0" },
                      { label: "Simulated Expected",  value: formatINR(simResult.simulated_expected_recovery), cls: "text-violet-300" },
                      { label: "Recovery Delta",      value: `+${formatINR(simResult.recovery_delta)}`,        cls: "stat-glow-jade" },
                    ].map(s => (
                      <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
                        <p className="text-2xs text-ink-500 font-mono uppercase">{s.label}</p>
                        <p className={`font-mono text-xl font-black mt-1.5 ${s.cls}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-ink-0 mb-2">Queue Distribution Shifts</h3>
                    <div className="table-shell rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-3 px-4 py-2.5 bg-base-200/60 text-2xs font-bold text-ink-500 uppercase tracking-wider border-b border-base-border">
                        <span>Queue</span><span className="text-center">Baseline</span><span className="text-center text-violet-300">Simulated</span>
                      </div>
                      {Object.keys(POLICY_LABELS).map(key => {
                        const base = simResult.baseline_tiers[key]  ?? 0;
                        const sim  = simResult.simulated_tiers[key] ?? 0;
                        return (
                          <div key={key} className="grid grid-cols-3 px-4 py-3 border-b border-base-border/60 last:border-0 text-xs font-mono">
                            <span className="font-sans text-ink-300">{POLICY_LABELS[key]}</span>
                            <span className="text-center text-ink-0">{base}</span>
                            <span className="text-center text-violet-300 font-bold">
                              {sim}
                              {sim !== base && (
                                <span className={`text-2xs ml-1 ${sim > base ? "text-jade-400" : "text-coral-400"}`}>
                                  ({sim > base ? "+" : ""}{sim - base})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                  <Sliders size={32} className="text-ink-500"/>
                  <p className="text-sm text-ink-400">Adjust policy parameters and run simulation</p>
                  <p className="text-xs text-ink-500">Results show how queue distributions shift</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════════ TAB 3: PLAYBOOK ══════════════════ */}
        {tab === "playbook" && (
          <motion.div key="playbook"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="grid grid-cols-[1fr_300px] gap-4">

            {/* Canvas */}
            <div className="card-surface rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                <div className="flex items-center gap-2">
                  <GitFork size={13} className="text-violet-400"/>
                  <span className="text-xs font-bold text-ink-0">Playbook Designer</span>
                </div>
                <span className="badge-jade text-2xs font-mono font-bold px-2 py-0.5 rounded-md">LIVE</span>
              </div>

              {/* Nodes */}
              <div className="p-6 max-h-[500px] overflow-y-auto space-y-0"
                style={{ background: "radial-gradient(hsl(var(--base-border)/0.3) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
                {nodes.map((node, i) => (
                  <div key={node.id} className="relative flex flex-col items-center">
                    {i > 0 && (
                      <div className="flex flex-col items-center my-1">
                        <div className="pipeline-line h-6 w-px"/>
                        <ArrowDown size={12} className="text-ink-500 -mt-1"/>
                      </div>
                    )}
                    <div className="group w-full max-w-md card-surface rounded-2xl p-4 border border-base-border hover:border-violet-500/30 transition-all flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <span className={`${NODE_BADGE[node.type]} text-2xs font-mono font-bold px-2 py-0.5 rounded-md uppercase inline-flex items-center gap-1`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${NODE_DOT[node.type]}`}/>
                          {node.type}
                        </span>
                        <h4 className="text-xs font-bold text-ink-0 mt-1">{node.title}</h4>
                        <p className="text-2xs text-ink-400 leading-relaxed">{node.desc}</p>
                      </div>
                      {node.type !== "trigger" && (
                        <button onClick={() => setNodes(nodes.filter(n => n.id !== node.id))}
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-xl flex items-center justify-center text-ink-500 hover:bg-coral-500/10 hover:text-coral-400 transition-all shrink-0">
                          <Trash size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-base-border bg-base-50/60">
                <span className="text-2xs text-ink-500 font-mono">{nodes.length} steps</span>
                <div className="flex gap-2">
                  <button onClick={() => setNodes([...nodes, { id: String(Date.now()), type:"decision", title:"New Decision Filter", desc:"Define conditional routing logic" }])}
                    className="badge-amber inline-flex items-center gap-1 text-2xs font-mono font-bold px-3 py-1.5 rounded-xl">
                    <Plus size={11}/> Filter
                  </button>
                  <button onClick={() => setNodes([...nodes, { id: String(Date.now()), type:"action", title:"New Action Step", desc:"Select intervention method" }])}
                    className="btn-glow-violet inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-2xs font-bold text-white">
                    <Plus size={11}/> Action
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="card-surface rounded-2xl p-5 space-y-4 self-start">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-violet-400"/>
                <h2 className="text-sm font-bold text-ink-0">Playbook Guide</h2>
              </div>
              <p className="text-xs text-ink-400 leading-relaxed">
                Playbooks define the execution path when a transaction enters the recovery queue. Build decision routes so high-value customers get human interventions while low-value anomalies trigger auto-retries.
              </p>

              <div className="space-y-2 pt-2 border-t border-base-border/60">
                <p className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider">Templates</p>
                <button onClick={() => setNodes(INITIAL_NODES)}
                  className="w-full text-left card-surface rounded-xl px-4 py-3 text-xs font-bold text-ink-300 hover:text-ink-0 transition-colors">
                  Default Payment Retry Flow
                </button>
                <button onClick={() => setNodes([
                  { id:"1", type:"trigger",  title:"Trigger: Subscription Past Due", desc:"Triggers on renewal failure" },
                  { id:"2", type:"action",   title:"Action: Dunning Cooldown",        desc:"Sleep 3 days, retry card" },
                  { id:"3", type:"action",   title:"Action: Churn-Voucher Campaign",  desc:"Send 15% discount link via Email" },
                ])}
                  className="w-full text-left card-surface rounded-xl px-4 py-3 text-xs font-bold text-ink-300 hover:text-ink-0 transition-colors">
                  Subscription Dunning Flow
                </button>
              </div>

              <button onClick={() => alert("Playbook saved to workspace")}
                className="btn-glow-violet w-full rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white">
                Save Playbook
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

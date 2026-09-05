"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Play,
  Shield,
  TrendingUp,
  Clock,
  FileText,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PipelineStep {
  step: number;
  name: string;
  status: "completed" | "ready" | "pending";
  detail: string;
}

interface DemoResult {
  simulation_mode: boolean;
  scenario_label: string;
  scenario_description: string;
  customer_id: string;
  customer_name: string;
  payment_id: string;
  opportunity_id: string;
  amount: number;
  failure_reason: string;
  payment_method: string;
  recovery_probability: number;
  expected_recovery: number;
  policy_status: string;
  recommended_intervention: string;
  confidence: string;
  priority: string;
  reason_codes: string[];
  policy_checks: Array<{ name: string; passed: boolean; detail: string }>;
  pipeline_steps: PipelineStep[];
}

const SCENARIOS = [
  {
    index: 0,
    label: "High-Value Bank Timeout",
    description: "₹25,000 UPI payment failed due to bank timeout — high recovery probability",
    expectedPolicy: "auto",
    amount: 25000,
    badge: "AUTO RETRY",
    badgeColor: "text-jade-400 bg-jade-500/10 border-jade-500/20",
  },
  {
    index: 1,
    label: "Insufficient Funds — Enterprise",
    description: "₹45,000 card payment declined — enterprise customer, escalation required",
    expectedPolicy: "escalated",
    amount: 45000,
    badge: "ESCALATED",
    badgeColor: "text-coral-400 bg-coral-500/10 border-coral-500/20",
  },
  {
    index: 2,
    label: "Card Declined — Growth Plan",
    description: "₹9,999 card declined — approval required before retry",
    expectedPolicy: "approval_required",
    amount: 9999,
    badge: "APPROVAL REQUIRED",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    index: 3,
    label: "Processing Error — Netbanking",
    description: "₹4,999 netbanking processing error — auto-retry eligible",
    expectedPolicy: "auto",
    amount: 4999,
    badge: "AUTO RETRY",
    badgeColor: "text-jade-400 bg-jade-500/10 border-jade-500/20",
  },
];

const POLICY_COLORS: Record<string, string> = {
  auto: "text-jade-400 bg-jade-500/10 border-jade-500/20",
  approval_required: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  escalated: "text-coral-400 bg-coral-500/10 border-coral-500/20",
  blocked: "text-ink-400 bg-base-200 border-base-border",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DemoModePage() {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animatingStep, setAnimatingStep] = useState(-1);

  async function triggerDemo() {
    setLoading(true);
    setResult(null);
    setError(null);
    setAnimatingStep(-1);

    try {
      const res = await fetch("/api/proxy?path=/demo/trigger-payment-failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_index: selectedScenario }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
      }

      const data: DemoResult = await res.json();

      // Animate pipeline steps sequentially
      setResult(data);
      for (let i = 0; i < data.pipeline_steps.length; i++) {
        await new Promise((r) => setTimeout(r, 350));
        setAnimatingStep(i);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const scenario = SCENARIOS[selectedScenario];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-enter">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink-500">Controlled Demo Environment</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-0">Demo Mode</h1>
          <p className="mt-1 text-sm text-ink-400">
            Trigger a simulated payment failure and watch PayPilot run the complete recovery pipeline in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
          <AlertTriangle size={12} className="text-amber-400" />
          <span className="text-xs font-medium text-amber-400">Simulation Environment — No real payments</span>
        </div>
      </div>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
        {/* Left: Scenario selector + trigger */}
        <div className="space-y-4">
          <section className="card-surface rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-medium text-ink-0">Select Demo Scenario</h2>
            <div className="space-y-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.index}
                  type="button"
                  onClick={() => { setSelectedScenario(s.index); setResult(null); setError(null); }}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedScenario === s.index
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-base-border bg-base-50/50 hover:border-base-border/80 hover:bg-base-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${selectedScenario === s.index ? "bg-violet-400" : "bg-base-border"}`} />
                        <p className="text-sm font-semibold text-ink-0">{s.label}</p>
                      </div>
                      <p className="mt-1 text-xs text-ink-400 pl-4">{s.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-bold text-ink-0">{formatINR(s.amount)}</p>
                      <span className={`mt-1 inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${s.badgeColor}`}>
                        {s.badge}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={triggerDemo}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-jade-500 px-5 py-3 text-sm font-semibold text-base-0 hover:bg-jade-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Running PayPilot pipeline…
                </>
              ) : (
                <>
                  <Play size={15} />
                  Trigger Payment Failure
                </>
              )}
            </button>
          </section>

          {/* Pipeline visualization — appears after trigger */}
          {result && (
            <section className="card-surface rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-violet-400" />
                <h2 className="text-sm font-medium text-ink-0">Recovery Pipeline</h2>
              </div>
              <div className="space-y-0">
                {result.pipeline_steps.map((step, i) => {
                  const visible = i <= animatingStep;
                  return (
                    <div
                      key={step.step}
                      className={`flex gap-3 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${
                          visible
                            ? step.status === "ready"
                              ? "border-jade-500/40 bg-jade-500/10 text-jade-400"
                              : "border-jade-500/40 bg-jade-500/10 text-jade-400"
                            : "border-base-border bg-base-50 text-ink-500"
                        }`}>
                          {visible ? <CheckCircle2 size={12} /> : step.step}
                        </div>
                        {i < result.pipeline_steps.length - 1 && (
                          <div className={`w-px flex-1 my-1 transition-all ${visible ? "bg-jade-500/30" : "bg-base-border"}`} />
                        )}
                      </div>
                      <div className="pb-3 flex-1">
                        <p className={`text-sm font-medium transition-colors ${visible ? "text-ink-0" : "text-ink-500"}`}>{step.name}</p>
                        <p className={`text-xs transition-colors ${visible ? "text-ink-400" : "text-ink-600"}`}>{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right: Result card */}
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-coral-500/30 bg-coral-500/5 p-5 text-sm text-coral-400">
              <p className="font-medium">Error</p>
              <p className="mt-1 text-xs text-coral-300">{error}</p>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card-surface rounded-xl p-8 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles size={20} className="text-violet-400" />
              </div>
              <p className="text-sm font-medium text-ink-0">Ready to run</p>
              <p className="text-xs text-ink-400 leading-relaxed">
                Select a scenario and click trigger to watch PayPilot process a payment failure end-to-end — risk scoring, policy evaluation, and opportunity creation all happen in real time against the database.
              </p>
            </div>
          )}

          {loading && (
            <div className="card-surface rounded-xl p-8 text-center space-y-3">
              <Loader2 size={24} className="animate-spin mx-auto text-violet-400" />
              <p className="text-sm text-ink-300">Running PayPilot pipeline…</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Recovery decision card */}
              <section className="rounded-xl border border-jade-500/20 bg-jade-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-jade-400" />
                  <h2 className="text-sm font-medium text-ink-0">Recovery Decision</h2>
                  <span className={`ml-auto inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${POLICY_COLORS[result.policy_status] ?? ""}`}>
                    {result.policy_status.replaceAll("_", " ").toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-ink-400">Customer</span>
                    <span className="text-xs font-semibold text-ink-0">{result.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-ink-400">Amount at risk</span>
                    <span className="font-mono text-sm font-bold text-coral-400">{formatINR(result.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-ink-400">Failure reason</span>
                    <span className="text-xs text-ink-0 capitalize">{result.failure_reason.replaceAll("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-ink-400">Payment method</span>
                    <span className="text-xs text-ink-0 capitalize">{result.payment_method}</span>
                  </div>
                  <div className="border-t border-base-border pt-2 mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-ink-400">Recovery probability</span>
                      <span className="font-mono text-sm font-bold text-jade-400">{(result.recovery_probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-ink-400">Expected recovery</span>
                      <span className="font-mono text-sm font-bold text-jade-300">{formatINR(result.expected_recovery)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-ink-400">Intervention</span>
                      <span className="text-xs font-medium text-ink-0 capitalize">{result.recommended_intervention.replaceAll("_", " ")}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Why this decision */}
              <section className="card-surface rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-violet-400" />
                  <h2 className="text-sm font-medium text-ink-0">Why this decision?</h2>
                </div>
                <div className="space-y-1.5">
                  {result.reason_codes.map((code, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-ink-300">
                      <ChevronRight size={11} className="text-violet-400 shrink-0" />
                      <span className="font-mono">{code}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-base-border pt-3 space-y-1.5">
                  <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">Policy Checks</p>
                  {result.policy_checks.map((check) => (
                    <div key={check.name} className={`flex items-center gap-2 text-xs ${check.passed ? "text-jade-400" : "text-coral-400"}`}>
                      {check.passed ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                      <span className="capitalize">{check.name.replaceAll("_", " ")}</span>
                      <span className="text-ink-500 text-[10px]">— {check.detail}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Navigation links */}
              <div className="space-y-2">
                <Link
                  href={`/revenue/opportunities?id=${result.opportunity_id}`}
                  className="flex items-center justify-between rounded-xl border border-base-border bg-base-50 px-4 py-3 text-sm font-medium text-ink-0 hover:border-jade-500/30 hover:bg-jade-500/5 transition group"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-jade-400" />
                    View in Recovery Queue
                  </div>
                  <ArrowRight size={14} className="text-ink-400 group-hover:text-jade-400 transition-colors" />
                </Link>
                <Link
                  href={`/customers/${result.customer_id}`}
                  className="flex items-center justify-between rounded-xl border border-base-border bg-base-50 px-4 py-3 text-sm font-medium text-ink-0 hover:border-violet-500/30 hover:bg-violet-500/5 transition group"
                >
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-violet-400" />
                    Open Customer 360
                  </div>
                  <ArrowRight size={14} className="text-ink-400 group-hover:text-violet-400 transition-colors" />
                </Link>
                <Link
                  href="/audit"
                  className="flex items-center justify-between rounded-xl border border-base-border bg-base-50 px-4 py-3 text-sm font-medium text-ink-0 hover:border-amber-500/30 hover:bg-amber-500/5 transition group"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-amber-400" />
                    View Audit Trail
                  </div>
                  <ArrowRight size={14} className="text-ink-400 group-hover:text-amber-400 transition-colors" />
                </Link>
                <Link
                  href="/copilot"
                  className="flex items-center justify-between rounded-xl border border-base-border bg-base-50 px-4 py-3 text-sm font-medium text-ink-0 hover:border-violet-500/30 hover:bg-violet-500/5 transition group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-400" />
                    Ask AI "What just happened?"
                  </div>
                  <ArrowRight size={14} className="text-ink-400 group-hover:text-violet-400 transition-colors" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

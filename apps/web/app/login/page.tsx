"use client";

import { useState } from "react";
import {
  ArrowRight, ShieldCheck, Lock, Eye, EyeOff,
  CreditCard, RefreshCw, TrendingUp, Zap, Sparkles,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email,    setEmail]    = useState("demo@paypilot.dev");
  const [password, setPassword] = useState("paypilot-demo");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Demo Merchant", email, password }),
      });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid credentials");
      }
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-base-0 text-ink-0 flex">

      {/* ════════════════════════
          LEFT — Brand story panel
          ════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden border-r border-base-border/60">

        {/* Ambient orbs */}
        <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-violet-500/8 blur-[130px]"/>
        <div aria-hidden className="pointer-events-none absolute right-0 bottom-0 h-[400px] w-[500px] rounded-full bg-jade-500/6 blur-[110px]"/>
        <div aria-hidden className="surface-grid absolute inset-0 opacity-25"/>

        {/* Top — logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl overflow-hidden bg-[#0D0B1E] flex items-center justify-center shadow-xl shadow-violet-600/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="PayPilot" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-ink-0">PAYPILOT</p>
            <p className="text-2xs text-violet-400 font-mono tracking-widest uppercase mt-0.5">Revenue Engine</p>
          </div>
        </div>

        {/* Middle — hero copy */}
        <div className="relative space-y-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3.5 py-1.5">
              <span className="live-dot">
                <span className="h-2 w-2 rounded-full bg-violet-400 block relative z-10"/>
              </span>
              <span className="text-xs font-mono font-semibold text-violet-300">Autonomous Recovery Engine · Active</span>
            </div>
            <h1 className="font-hero text-ink-0">
              Stop losing<br/>
              <span className="gradient-text-brand">revenue to failed</span><br/>
              payments.
            </h1>
            <p className="max-w-md text-base text-ink-300 leading-relaxed">
              PayPilot detects revenue leakage in real time, scores every failed payment for recoverability, and automatically recovers what's yours.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "₹6.62L", label: "Recovered",      cls: "stat-glow-jade" },
              { value: "34.2%",  label: "Recovery rate",  cls: "stat-glow-violet" },
              { value: "8.9h",   label: "Avg time to recover", cls: "stat-glow-amber" },
            ].map(s => (
              <div key={s.label} className="card-surface rounded-2xl p-4">
                <p className={`font-mono text-2xl font-black ${s.cls}`}>{s.value}</p>
                <p className="text-xs text-ink-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Feature points */}
          <div className="space-y-3">
            {[
              { icon: CreditCard, text: "Detects failed payments, abandoned checkouts & subscription churn" },
              { icon: TrendingUp, text: "AI scores every case for recoverability with full explainability" },
              { icon: RefreshCw,  text: "Executes approved recoveries automatically within policy guardrails" },
              { icon: ShieldCheck,text: "Every action is logged, auditable and policy-governed" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-violet-500/12 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={12} className="text-violet-400"/>
                </div>
                <p className="text-sm text-ink-300 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — trust badges */}
        <div className="relative flex items-center gap-6 text-xs text-ink-500">
          {[
            { icon: ShieldCheck, label: "Bank-grade encryption" },
            { icon: Lock,        label: "SOC 2 Type II" },
            { icon: Zap,         label: "99.9% uptime SLA" },
          ].map(t => (
            <span key={t.label} className="flex items-center gap-1.5">
              <t.icon size={12} className="text-jade-500"/>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════
          RIGHT — Sign in form
          ════════════════════════ */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm animate-enter">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="h-9 w-9 rounded-xl overflow-hidden bg-[#0D0B1E]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="PayPilot" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-ink-0">PAYPILOT</span>
          </div>

          {/* Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-ink-0">Sign in</h2>
            <p className="mt-1.5 text-sm text-ink-400">
              Demo credentials are pre-filled.{" "}
              <span className="text-violet-400 font-semibold">Just click Sign In.</span>
            </p>
          </div>

          {/* Demo notice */}
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/8 px-4 py-3.5">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-violet-400"/>
            <div>
              <p className="text-xs font-bold text-violet-300">Demo Environment</p>
              <p className="text-xs text-ink-400 mt-0.5">
                You're signing into a live demo with real recovery data, seeded for demonstration.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                className="w-full rounded-xl border border-base-border bg-base-100 px-4 py-3 text-sm text-ink-0 outline-none transition placeholder:text-ink-500 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
                placeholder="you@company.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-2xs font-mono font-bold text-ink-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  className="w-full rounded-xl border border-base-border bg-base-100 px-4 py-3 pr-11 text-sm text-ink-0 outline-none transition placeholder:text-ink-500 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors">
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-coral-500/30 bg-coral-500/10 px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-coral-400 shrink-0"/>
                <p className="text-xs text-coral-300">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-3.5 text-sm font-bold text-white transition
                shadow-[0_0_24px_rgba(124,111,240,0.35)]
                hover:shadow-[0_0_36px_rgba(124,111,240,0.5)]
                hover:-translate-y-0.5 active:translate-y-0
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {/* Shine effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"/>
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"/>
                  Signing in…
                </>
              ) : (
                <>
                  Enter Command Center
                  <ArrowRight size={15} className="transition group-hover:translate-x-0.5"/>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-base-border/60"/>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-base-0 px-3 text-2xs text-ink-500">Secured by PayPilot</span>
            </div>
          </div>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-5 text-xs text-ink-500">
            <span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-jade-500"/>256-bit SSL</span>
            <span className="flex items-center gap-1.5"><Lock size={11} className="text-jade-500"/>Encrypted</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-jade-500"/>Policy-governed</span>
          </div>

          {/* Landing link */}
          <div className="mt-5 text-center">
            <Link href="/landing" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              View product story →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

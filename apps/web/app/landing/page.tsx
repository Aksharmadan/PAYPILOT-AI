"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  FileText,
  BrainCircuit,
  FlaskConical,
  TrendingUp,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Clock,
  DollarSign,
  Target,
  Eye,
  Layers,
  GitBranch,
  Lock,
} from "lucide-react";

/* ──────────────────────────────────────────────
   RECOVERY PIPELINE DATA
   ────────────────────────────────────────────── */
const PIPELINE_STEPS = [
  {
    id: 1,
    label: "Payment Failed",
    tag: "EVENT DETECTED",
    tagColor: "badge-coral",
    icon: AlertTriangle,
    iconColor: "text-coral-400",
    accentColor: "coral",
    title: "UPI Bank Timeout",
    subtitle: "₹25,000 checkout failed during peak congestion",
    meta: [
      { k: "Amount",     v: "₹25,000" },
      { k: "Error",      v: "bank_timeout" },
      { k: "Gateway",    v: "Primary UPI" },
    ],
  },
  {
    id: 2,
    label: "AI Analysis",
    tag: "ML ENGINE",
    tagColor: "badge-violet",
    icon: BrainCircuit,
    iconColor: "text-violet-400",
    accentColor: "violet",
    title: "Behavioral Feature Extraction",
    subtitle: "Customer LTV, retry history, and PSP health evaluated",
    meta: [
      { k: "Customer LTV", v: "₹49,995" },
      { k: "Prior Retries", v: "0 of 3" },
      { k: "Churn Score",  v: "Low 0.12" },
    ],
  },
  {
    id: 3,
    label: "Risk Score",
    tag: "CONFIDENCE: HIGH",
    tagColor: "badge-jade",
    icon: Target,
    iconColor: "text-jade-300",
    accentColor: "jade",
    title: "88% Recovery Probability",
    subtitle: "Expected recovery value ₹22,000 — queue rank #1",
    meta: [
      { k: "Probability",  v: "88.0%" },
      { k: "Exp. Value",   v: "₹22,000" },
      { k: "Priority",     v: "Critical" },
    ],
  },
  {
    id: 4,
    label: "Policy Check",
    tag: "AUTO APPROVED",
    tagColor: "badge-jade",
    icon: Shield,
    iconColor: "text-jade-300",
    accentColor: "jade",
    title: "5 Policy Rules Passed",
    subtitle: "Amount within threshold · cooldown satisfied · retries available",
    meta: [
      { k: "Max Retries",  v: "0 / 3 used" },
      { k: "Cooldown",     v: "12h passed" },
      { k: "Decision",     v: "Auto-approve" },
    ],
  },
  {
    id: 5,
    label: "Smart Retry",
    tag: "EXECUTING",
    tagColor: "badge-amber",
    icon: Zap,
    iconColor: "text-amber-400",
    accentColor: "amber",
    title: "Dynamic Gateway Rerouting",
    subtitle: "Secondary PSP selected · low-friction execution window",
    meta: [
      { k: "Selected PSP", v: "Backup UPI" },
      { k: "Method",       v: "Smart Retry" },
      { k: "Status",       v: "In Progress" },
    ],
  },
  {
    id: 6,
    label: "Recovered",
    tag: "SUCCESS",
    tagColor: "badge-jade",
    icon: CheckCircle2,
    iconColor: "text-jade-300",
    accentColor: "jade",
    title: "₹25,000 Preserved",
    subtitle: "MRR protected · audit logged · lift recorded",
    meta: [
      { k: "Recovered",   v: "₹25,000" },
      { k: "Net Lift",    v: "+₹22,000" },
      { k: "Audit ID",    v: "ev_99201" },
    ],
  },
];

const accentBorder: Record<string, string> = {
  coral:  "border-coral-500/30",
  violet: "border-violet-500/30",
  jade:   "border-jade-500/30",
  amber:  "border-amber-500/30",
};
const accentBg: Record<string, string> = {
  coral:  "bg-coral-500/8",
  violet: "bg-violet-500/8",
  jade:   "bg-jade-500/8",
  amber:  "bg-amber-500/8",
};

/* ──────────────────────────────────────────────
   SCROLL REVEAL — fade+rise on scroll
   Lightweight: CSS transition only, no JS animation
   ────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        willChange: visible ? "auto" : "opacity, transform",
        transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────── */
export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setActiveStep(s => (s + 1) % PIPELINE_STEPS.length), 3000);
    return () => clearInterval(t);
  }, [playing]);

  const step = PIPELINE_STEPS[activeStep];

  return (
    <div className="min-h-screen bg-base-0 text-ink-0 overflow-x-hidden font-sans">

      {/* ── Global ambient backdrop ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[900px] rounded-full bg-violet-600/8 blur-[130px]" />
        <div className="absolute top-[900px] right-0 h-[500px] w-[700px] rounded-full bg-jade-500/5 blur-[120px]" />
        <div className="absolute top-[1800px] left-0 h-[600px] w-[600px] rounded-full bg-coral-500/5 blur-[140px]" />
        <div className="absolute top-[2800px] right-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/5 blur-[120px]" />
        <div className="surface-grid absolute inset-0 opacity-30" />
      </div>

      {/* ════════════════════════════════════
          NAVBAR
          ════════════════════════════════════ */}
      <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 lg:px-10 border-b border-base-border/50 bg-base-0/75 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative h-8 w-8 rounded-xl overflow-hidden bg-[#0D0B1E] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="PayPilot" className="w-full h-full object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-jade-400 border-2 border-base-0 shadow-sm" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-ink-0 text-sm leading-none">PAYPILOT</div>
            <div className="text-2xs text-violet-400 font-mono tracking-widest uppercase mt-0.5">Revenue Engine</div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {[
            ["01 DETECT",   "#s-detect"],
            ["02 SCORE",    "#s-score"],
            ["03 DECIDE",   "#s-decide"],
            ["04 RECOVER",  "#s-recover"],
            ["05 MEASURE",  "#s-measure"],
            ["06 AI",       "#s-ai"],
          ].map(([label, href]) => (
            <a key={href} href={href}
              className="px-3 py-1.5 text-2xs font-mono text-ink-500 hover:text-violet-400 rounded-md hover:bg-violet-500/8 transition-all duration-160">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="text-xs font-medium text-ink-300 hover:text-ink-0 px-3 py-1.5 rounded-lg transition-colors duration-160">
            Sign in
          </Link>
          <Link href="/command-center" className="btn-glow-violet inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
            Enter PayPilot <ArrowRight size={12} />
          </Link>
        </div>
      </header>

      {/* ════════════════════════════════════
          HERO
          ════════════════════════════════════ */}
      <section className="relative z-10 pt-20 pb-8 px-6 lg:px-10 text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 mb-10 animate-fade-in">
          <span className="live-dot">
            <span className="h-2 w-2 rounded-full bg-jade-400 block relative z-10" />
          </span>
          <span className="text-2xs font-mono font-semibold tracking-widest text-violet-300 uppercase">
            Autonomous Revenue Recovery · Live Engine
          </span>
        </div>

        {/* Display headline */}
        <div className="max-w-5xl mx-auto space-y-4 animate-rise">
          <h1 className="font-display text-ink-0 leading-none">
            Your revenue shouldn't<br />
            disappear because a{" "}
            <span className="gradient-text-coral">payment failed.</span>
          </h1>
          <p className="max-w-xl mx-auto text-base lg:text-lg text-ink-300 leading-relaxed mt-6">
            PayPilot is the AI-powered recovery infrastructure that detects payment
            failures, scores recoverability, evaluates merchant policies, and executes
            smart retries — all in real time.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10 animate-rise stagger-2">
          <Link href="/command-center"
            className="btn-glow-violet inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3.5 text-sm font-bold text-white">
            ENTER PAYPILOT
            <ArrowRight size={15} />
          </Link>
          <a href="#s-detect"
            className="btn-ghost inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold">
            <Play size={13} />
            SEE HOW IT WORKS
          </a>
        </div>

        {/* Social proof bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 animate-fade-in stagger-4">
          {[
            { label: "Recovery Rate",    value: "34.2%" },
            { label: "Avg Recovery Time", value: "8.9h" },
            { label: "Revenue Recovered", value: "₹6.62L" },
            { label: "Incremental Lift",  value: "₹4.14L" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-mono text-xl font-bold text-ink-0">{s.value}</div>
              <div className="text-2xs text-ink-500 font-mono uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════
          INTERACTIVE RECOVERY PIPELINE
          ════════════════════════════════════ */}
      <section className="relative z-10 px-6 lg:px-10 pb-24 pt-8">
        <div className="max-w-5xl mx-auto animate-rise stagger-3">
          <div className="card-surface rounded-2xl border border-violet-500/20 bg-base-100/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">

            {/* Terminal title bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-coral-500 opacity-80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500 opacity-80" />
                  <span className="h-3 w-3 rounded-full bg-jade-500 opacity-80" />
                </div>
                <span className="ml-2 font-mono text-2xs text-ink-500">
                  paypilot.recovery_pipeline · live simulation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-2xs font-mono text-jade-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse" />
                  ACTIVE ENGINE
                </span>
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="flex items-center gap-1.5 text-2xs font-mono text-ink-500 hover:text-ink-300 bg-base-200 px-2.5 py-1 rounded border border-base-border/60 transition-colors"
                >
                  {playing ? <><Pause size={10} /> PAUSE</> : <><Play size={10} /> PLAY</>}
                </button>
              </div>
            </div>

            {/* Step tabs */}
            <div className="grid grid-cols-6 gap-px bg-base-border/40 border-b border-base-border">
              {PIPELINE_STEPS.map((s, i) => {
                const active = activeStep === i;
                const done   = i < activeStep;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActiveStep(i); setPlaying(false); }}
                    className={`relative flex flex-col items-center gap-1 py-3 px-2 text-center transition-all duration-240 ${
                      active ? "bg-violet-500/12" : done ? "bg-jade-500/5" : "bg-base-100/60 hover:bg-base-200/60"
                    }`}
                    aria-label={`Step ${s.id}: ${s.label}`}
                  >
                    <span className={`font-mono text-2xs font-bold ${active ? "text-violet-400" : done ? "text-jade-500" : "text-ink-500"}`}>
                      0{s.id}
                    </span>
                    <span className={`text-2xs font-semibold leading-tight ${active ? "text-ink-0" : "text-ink-300"}`}>
                      {s.label}
                    </span>
                    {active && (
                      <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
                    )}
                    {done && !active && (
                      <span className="absolute bottom-0 inset-x-0 h-0.5 bg-jade-500/40" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active step content */}
            <div
              key={step.id}
              className="p-6 flex flex-col md:flex-row gap-6 items-start animate-enter"
            >
              {/* Left — step description */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accentBg[step.accentColor]} border ${accentBorder[step.accentColor]}`}>
                    <step.icon size={18} className={step.iconColor} />
                  </div>
                  <span className={`text-2xs font-mono font-bold px-2.5 py-1 rounded-md ${step.tagColor}`}>
                    {step.tag}
                  </span>
                  <span className="font-mono text-2xs text-ink-500">Step {step.id} of 6</span>
                </div>
                <h3 className="text-xl font-bold text-ink-0 leading-tight">{step.title}</h3>
                <p className="text-sm text-ink-300 leading-relaxed">{step.subtitle}</p>

                {/* Progress bar */}
                <div className="w-full h-1 rounded-full bg-base-300/60 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full progress-bar-violet transition-all duration-700"
                    style={{ width: `${(step.id / 6) * 100}%` }}
                  />
                </div>
              </div>

              {/* Right — data payload */}
              <div className="shrink-0 w-full md:w-64 grid grid-cols-3 md:grid-cols-1 gap-2">
                {step.meta.map(m => (
                  <div key={m.k} className="glass-card rounded-xl p-3">
                    <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{m.k}</p>
                    <p className="font-mono text-sm font-bold text-ink-0 mt-0.5">{m.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline connector row — shows all 6 steps with connecting arrows */}
            <div className="px-6 pb-5">
              <div className="flex items-center justify-between">
                {PIPELINE_STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center flex-1 min-w-0">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-2xs font-mono font-bold shrink-0 transition-all duration-400 ${
                      i < activeStep  ? "bg-jade-500 text-white shadow-sm shadow-jade-500/30" :
                      i === activeStep ? "bg-violet-500 text-white shadow-sm shadow-violet-500/30 ring-2 ring-violet-500/30" :
                                         "bg-base-300 text-ink-500"
                    }`}>
                      {i < activeStep ? <CheckCircle2 size={12} /> : s.id}
                    </div>
                    {i < 5 && (
                      <div className={`flex-1 h-px mx-1 transition-all duration-700 ${
                        i < activeStep ? "bg-jade-500/60" : "bg-base-border/60"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 01 — DETECT
          ════════════════════════════════════ */}
      <section id="s-detect" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <Reveal className="space-y-6">
              <span className="inline-flex items-center gap-2 text-2xs font-mono font-bold text-coral-400 uppercase tracking-widest badge-coral px-3 py-1.5 rounded-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-coral-400" />
                01 · Revenue Leaks
              </span>
              <h2 className="font-section text-ink-0">
                Failed payments are your biggest invisible cash leak.
              </h2>
              <p className="text-base text-ink-300 leading-relaxed">
                Up to 19% of SaaS recurring revenue is lost not because customers cancelled — but because of bank timeouts, expired mandates, gateway rate limits, and silently failing retries.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="card-surface rounded-2xl p-5 space-y-1.5">
                  <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">Avg Leak Rate</p>
                  <p className="font-mono text-3xl font-black text-coral-400">19.2%</p>
                  <p className="text-xs text-ink-400">of total attempt volume</p>
                </div>
                <div className="card-surface rounded-2xl p-5 space-y-1.5">
                  <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">Top Cause</p>
                  <p className="font-mono text-2xl font-black text-amber-400">UPI Timeout</p>
                  <p className="text-xs text-ink-400">NPCI peak congestion</p>
                </div>
              </div>
            </Reveal>

            {/* Live event stream widget */}
            <Reveal delay={150}>
              <div className="card-surface rounded-2xl border border-coral-500/20 bg-base-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/80">
                  <div className="flex items-center gap-2">
                    <Activity size={13} className="text-coral-400 animate-pulse" />
                    <span className="text-2xs font-mono text-ink-300 font-semibold">REALTIME EVENT STREAM</span>
                  </div>
                  <span className="text-2xs font-mono text-ink-500">webhook ingest · live</span>
                </div>
                <div className="p-4 space-y-2.5 font-mono">
                  {[
                    { type: "payment.failed",           id: "pay_90218", amount: "₹45,000", code: "bank_timeout",    color: "text-coral-400",  bg: "bg-coral-500/8 border-coral-500/20" },
                    { type: "subscription.past_due",     id: "sub_10928", amount: "₹25,000", code: "card_declined",   color: "text-amber-400",  bg: "bg-amber-500/8 border-amber-500/20" },
                    { type: "checkout.abandoned",        id: "chk_44012", amount: "₹9,999",  code: "session_timeout", color: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/20" },
                    { type: "payment.failed",           id: "pay_90305", amount: "₹18,500", code: "insufficient_bal", color: "text-coral-400",  bg: "bg-coral-500/8 border-coral-500/20" },
                  ].map((ev, i) => (
                    <div key={ev.id} className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${ev.bg}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-2xs font-bold ${ev.color} truncate`}>{ev.type}</span>
                        <span className="text-2xs text-ink-500 hidden sm:block">{ev.id}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-2xs text-ink-500">{ev.code}</span>
                        <span className="text-xs font-bold text-ink-0">{ev.amount}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1 text-2xs text-ink-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse" />
                    PayPilot is watching all payment events in real time
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 02 — UNDERSTAND / SCORE
          ════════════════════════════════════ */}
      <section id="s-score" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Scoring widget */}
            <Reveal className="order-2 lg:order-1">
              <div className="card-surface rounded-2xl border border-jade-500/20 bg-base-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/80">
                  <div className="flex items-center gap-2">
                    <BrainCircuit size={13} className="text-jade-400" />
                    <span className="text-2xs font-mono text-ink-300 font-semibold">RECOVERABILITY ENGINE</span>
                  </div>
                  <span className="text-2xs font-mono font-bold text-jade-300">88% PROBABILITY</span>
                </div>
                <div className="p-5 space-y-3">
                  {/* Score arc */}
                  <div className="flex items-center justify-center py-4">
                    <div className="relative h-28 w-28">
                      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--base-300))" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke="url(#scoreGrad)" strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="264" strokeDashoffset={264 * (1 - 0.88)}
                          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
                        />
                        <defs>
                          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22C08A" />
                            <stop offset="100%" stopColor="#34E8A0" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono text-2xl font-black text-jade-300">88%</span>
                        <span className="text-2xs text-ink-500 font-mono">RECOVERY</span>
                      </div>
                    </div>
                  </div>
                  {/* Signal breakdown */}
                  <div className="space-y-2">
                    {[
                      { label: "Prior recovery success",     delta: "+22%", positive: true },
                      { label: "High account LTV ₹49.9K",    delta: "+18%", positive: true },
                      { label: "First retry (0 prior retries)", delta: "+14%", positive: true },
                      { label: "UPI bank timeout failure",   delta: "−8%",  positive: false },
                      { label: "Peak congestion window",     delta: "−6%",  positive: false },
                    ].map(sig => (
                      <div key={sig.label} className="flex items-center justify-between glass-card rounded-xl px-4 py-2.5">
                        <span className="text-xs text-ink-300">{sig.label}</span>
                        <span className={`font-mono text-xs font-bold ${sig.positive ? "text-jade-300" : "text-coral-400"}`}>
                          {sig.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={150} className="order-1 lg:order-2 space-y-6">
              <span className="inline-flex items-center gap-2 text-2xs font-mono font-bold text-jade-400 uppercase tracking-widest badge-jade px-3 py-1.5 rounded-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-400" />
                02 · Understand
              </span>
              <h2 className="font-section text-ink-0">
                Not all failed payments are worth chasing.
              </h2>
              <p className="text-base text-ink-300 leading-relaxed">
                PayPilot's AI engine evaluates customer LTV, retry history, payment method signals, and PSP health to score each failure's recovery probability before committing a single retry.
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  "Probabilistic recovery scoring per payment",
                  "Explainable signal breakdown — not a black box",
                  "Ranked opportunity queue by expected value",
                  "High/medium/low confidence tiers",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-ink-300">
                    <CheckCircle2 size={14} className="text-jade-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 03 — DECIDE
          ════════════════════════════════════ */}
      <section id="s-decide" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <Reveal className="space-y-6">
              <span className="inline-flex items-center gap-2 text-2xs font-mono font-bold text-amber-400 uppercase tracking-widest badge-amber px-3 py-1.5 rounded-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                03 · Decide
              </span>
              <h2 className="font-section text-ink-0">
                Policy guardrails protect your customer relationships.
              </h2>
              <p className="text-base text-ink-300 leading-relaxed">
                Every recovery action passes through your merchant policy matrix — enforcing amount limits, retry cooldowns, contact frequency caps, and approval workflows before anything executes.
              </p>
              {/* Automation visual */}
              <div className="pt-2 space-y-2">
                {[
                  { label: "TRIGGER",    value: "payment.failed",          color: "text-coral-400" },
                  { label: "CONDITION",  value: "recovery_prob > 70%",     color: "text-violet-400" },
                  { label: "POLICY",     value: "retries < 3 · amount ≤ ₹25k", color: "text-amber-400" },
                  { label: "ACTION",     value: "auto_retry via backup PSP", color: "text-jade-400" },
                  { label: "OUTCOME",    value: "record_lift → audit_log",  color: "text-ink-300" },
                ].map((row, i) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-20 text-2xs font-mono font-bold text-ink-500 text-right shrink-0">{row.label}</div>
                    <div className="h-px w-4 bg-base-border/80 shrink-0" />
                    <div className={`glass-card rounded-xl px-4 py-2.5 flex-1 font-mono text-xs font-semibold ${row.color}`}>
                      {row.value}
                    </div>
                    {i < 4 && <div className="pipeline-line h-6 w-px shrink-0 mx-2 hidden sm:block" />}
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Policy check card */}
            <Reveal delay={150}>
              <div className="card-surface rounded-2xl border border-amber-500/20 bg-base-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/80">
                  <div className="flex items-center gap-2">
                    <Shield size={13} className="text-amber-400" />
                    <span className="text-2xs font-mono text-ink-300 font-semibold">MERCHANT POLICY CHECK</span>
                  </div>
                  <span className="text-2xs font-mono text-jade-400 font-bold">5 / 5 PASSED</span>
                </div>
                <div className="p-5 space-y-2.5">
                  {[
                    { rule: "Max retry limit",       detail: "0 of 3 retries used",          pass: true },
                    { rule: "Auto-approval amount",  detail: "₹25,000 ≤ ₹25,000 threshold",  pass: true },
                    { rule: "Retry cooldown window", detail: "12h elapsed · satisfied",       pass: true },
                    { rule: "Contact frequency cap", detail: "2 of 3 contacts this week",     pass: true },
                    { rule: "Customer flag check",   detail: "No flags on account",          pass: true },
                  ].map(r => (
                    <div key={r.rule} className="flex items-center justify-between glass-card rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-ink-100">{r.rule}</p>
                        <p className="text-2xs text-ink-500 mt-0.5">{r.detail}</p>
                      </div>
                      <CheckCircle2 size={16} className="text-jade-400 shrink-0" />
                    </div>
                  ))}
                  <div className="badge-jade rounded-xl px-4 py-3 flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-jade-300">Decision: AUTO APPROVE</span>
                    <Zap size={14} className="text-jade-300" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 04 — RECOVER (BIG STAT)
          ════════════════════════════════════ */}
      <section id="s-recover" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="section-divider mb-24" />

          {/* Hero stats row */}
          <Reveal className="text-center mb-20">
            <span className="text-2xs font-mono font-bold text-jade-400 uppercase tracking-widest badge-jade px-3 py-1.5 rounded-lg mb-6 inline-block">
              04 · Recover
            </span>
            <div className="font-display gradient-text-jade mt-4">
              ₹6.62L recovered.
            </div>
            <p className="text-base text-ink-300 mt-6 max-w-md mx-auto">
              Revenue that would have silently disappeared. Recovered by PayPilot's autonomous execution engine.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Recovered",   display: "₹6.62L",  color: "stat-glow-jade",   sub: "Verified payment outcomes" },
              { label: "Incremental Lift",  display: "₹4.14L",  color: "stat-glow-violet", sub: "Above organic 12% baseline" },
              { label: "Recovery Rate",     display: "34.2%",   color: "text-ink-0",        sub: "1 in 3 failures recovered" },
              { label: "Avg Recovery Time", display: "8.9h",    color: "stat-glow-amber",   sub: "From failure to resolution" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 60}>
                <div className="card-surface rounded-2xl p-6 text-center space-y-2 card-glow-jade cursor-default">
                  <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`font-mono text-3xl font-black ${s.color}`}>{s.display}</p>
                  <p className="text-2xs text-ink-500">{s.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Recovery state visualization */}
          <Reveal delay={200} className="mt-8">
            <div className="card-surface rounded-2xl border border-base-border bg-base-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-ink-0">Live Recovery Engine — Current Queue</h3>
                <span className="text-2xs font-mono text-jade-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse" />
                  Processing
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { state: "Queued",     count: 8,  color: "text-ink-300",  bg: "bg-base-200",        dot: "bg-ink-500" },
                  { state: "Analysing",  count: 3,  color: "text-violet-400", bg: "bg-violet-500/10",  dot: "bg-violet-400" },
                  { state: "Awaiting",   count: 2,  color: "text-amber-400",  bg: "bg-amber-500/10",   dot: "bg-amber-400" },
                  { state: "Executing",  count: 5,  color: "text-jade-400",   bg: "bg-jade-500/10",    dot: "bg-jade-400" },
                  { state: "Recovered",  count: 47, color: "text-jade-300",   bg: "bg-jade-500/15",    dot: "bg-jade-300" },
                  { state: "Failed",     count: 6,  color: "text-coral-400",  bg: "bg-coral-500/10",   dot: "bg-coral-400" },
                  { state: "Escalated",  count: 1,  color: "text-amber-500",  bg: "bg-amber-500/10",   dot: "bg-amber-500" },
                ].map(s => (
                  <div key={s.state} className={`rounded-xl ${s.bg} p-3 text-center`}>
                    <div className={`font-mono text-xl font-black ${s.color}`}>{s.count}</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      <span className="text-2xs text-ink-500 font-mono">{s.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 05 — MEASURE / EXPERIMENTS
          ════════════════════════════════════ */}
      <section id="s-measure" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Experiment card */}
            <Reveal>
              <div className="card-surface rounded-2xl border border-violet-500/20 bg-base-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/80">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={13} className="text-violet-400" />
                    <span className="text-2xs font-mono text-ink-300 font-semibold">EXPERIMENT: EXP-009</span>
                  </div>
                  <span className="badge-jade text-2xs font-mono font-bold px-2 py-0.5 rounded-md">SIGNIFICANT</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-ink-0">Immediate vs Delayed Retry Timing</p>
                    <p className="text-xs text-ink-400 mt-1">Does delaying retries by 4h improve recovery rate?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Control",   rate: "24.1%",  lift: "Baseline", color: "text-ink-300",  bar: "bg-base-300" },
                      { label: "Treatment", rate: "38.7%",  lift: "+14.6pp",  color: "text-jade-300", bar: "progress-bar-jade" },
                    ].map(v => (
                      <div key={v.label} className="glass-card rounded-xl p-4 space-y-2">
                        <p className="text-2xs font-mono text-ink-500 uppercase">{v.label}</p>
                        <p className={`font-mono text-2xl font-black ${v.color}`}>{v.rate}</p>
                        <p className={`text-xs font-semibold ${v.color}`}>{v.lift}</p>
                        <div className="h-1.5 rounded-full bg-base-300/60">
                          <div className={`h-1.5 rounded-full ${v.bar}`} style={{ width: v.rate }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-base-border/60 text-center">
                    <div>
                      <p className="font-mono text-base font-black text-jade-300">+60.6%</p>
                      <p className="text-2xs text-ink-500 font-mono">RELATIVE LIFT</p>
                    </div>
                    <div>
                      <p className="font-mono text-base font-black text-ink-0">1,247</p>
                      <p className="text-2xs text-ink-500 font-mono">SAMPLE SIZE</p>
                    </div>
                    <div>
                      <p className="font-mono text-base font-black text-violet-400">97.2%</p>
                      <p className="text-2xs text-ink-500 font-mono">CONFIDENCE</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={150} className="space-y-6">
              <span className="inline-flex items-center gap-2 text-2xs font-mono font-bold text-violet-400 uppercase tracking-widest badge-violet px-3 py-1.5 rounded-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                05 · Learn
              </span>
              <h2 className="font-section text-ink-0">
                Continuous experimentation compounds recovery.
              </h2>
              <p className="text-base text-ink-300 leading-relaxed">
                PayPilot's experiment engine runs controlled A/B tests across retry timing, gateway sequencing, and intervention strategies — so every recovery strategy gets provably better over time.
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  "Randomized controlled trial design",
                  "Statistical significance tracking",
                  "Incremental lift measurement",
                  "Strategy promotion when significant",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-ink-300">
                    <CheckCircle2 size={14} className="text-violet-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 06 — AI ANALYST
          ════════════════════════════════════ */}
      <section id="s-ai" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <Reveal className="space-y-6">
              <span className="inline-flex items-center gap-2 text-2xs font-mono font-bold text-violet-400 uppercase tracking-widest badge-violet px-3 py-1.5 rounded-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                06 · AI Analyst
              </span>
              <h2 className="font-section text-ink-0">
                Ask anything. Get financially grounded answers.
              </h2>
              <p className="text-base text-ink-300 leading-relaxed">
                PayPilot's Revenue Analyst is not a generic chatbot. It's a tool-backed AI that queries your actual payment data, scores, and audit trail to answer precise revenue questions.
              </p>
              <div className="space-y-2 pt-2">
                {[
                  "What's my biggest revenue risk right now?",
                  "Which customers are likely to churn next week?",
                  "Why did recovery rate drop this period?",
                  "Which retry strategy has the highest lift?",
                ].map(q => (
                  <div key={q} className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                    <Sparkles size={12} className="text-violet-400 shrink-0" />
                    <span className="text-xs text-ink-300">{q}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* AI chat preview */}
            <Reveal delay={150}>
              <div className="card-surface rounded-2xl border border-violet-500/20 bg-base-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/80">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-violet-400" />
                    <span className="text-2xs font-mono text-ink-300 font-semibold">PAYPILOT REVENUE ANALYST</span>
                  </div>
                  <span className="badge-jade text-2xs font-mono font-bold px-2 py-0.5 rounded-md">ACTIVE ENGINE</span>
                </div>
                <div className="p-5 space-y-4">
                  {/* AI initial briefing */}
                  <div className="glass-card rounded-2xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <Sparkles size={13} className="text-violet-400" />
                      </div>
                      <div className="space-y-2 flex-1 min-w-0">
                        <p className="text-xs text-ink-300 leading-relaxed">
                          <span className="font-semibold text-ink-0">3 things need your attention</span> — ₹2.4L at high-confidence risk, 2 high-value customers with elevated churn scores, and EXP-009 is ready for promotion with 97.2% confidence.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "At Risk",     value: "₹2.4L",  color: "text-coral-400" },
                            { label: "Recoverable", value: "₹1.8L",  color: "text-jade-300" },
                            { label: "Confidence",  value: "High",    color: "text-violet-400" },
                          ].map(m => (
                            <div key={m.label} className="bg-base-200/60 rounded-lg p-2 text-center">
                              <p className={`font-mono text-sm font-bold ${m.color}`}>{m.value}</p>
                              <p className="text-2xs text-ink-500 mt-0.5">{m.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Tool use indicator */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-violet-500/8 border border-violet-500/15">
                    <div className="h-5 w-5 rounded-md bg-violet-500/20 flex items-center justify-center shrink-0">
                      <BarChart3 size={11} className="text-violet-400" />
                    </div>
                    <span className="text-2xs font-mono text-violet-400">get_revenue_summary(days=30)</span>
                    <CheckCircle2 size={11} className="text-jade-400 ml-auto shrink-0" />
                  </div>
                  {/* Input bar */}
                  <div className="flex items-center gap-2 glass-card rounded-xl px-4 py-2.5 mt-2">
                    <span className="text-xs text-ink-500 flex-1">Ask about your revenue...</span>
                    <div className="h-6 w-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <ArrowRight size={11} className="text-violet-400" />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 07 — AUDIT TRAIL
          ════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <span className="badge-neutral text-2xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block mb-6">
              07 · Trace Everything
            </span>
            <h2 className="font-section text-ink-0">Every recovery tells a forensic story.</h2>
            <p className="text-base text-ink-300 mt-4 max-w-xl mx-auto">
              Every decision, action, and outcome is immutably logged. From payment failure to recovered revenue — the complete trace is always available.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="card-surface rounded-2xl border border-base-border bg-base-100 p-6 max-w-2xl mx-auto">
              <div className="space-y-0">
                {[
                  { event: "payment.failed",          time: "14:02:11", icon: AlertTriangle, color: "text-coral-400", bg: "bg-coral-500/10 border-coral-500/20", detail: "₹25,000 · bank_timeout" },
                  { event: "opportunity.created",      time: "14:02:12", icon: Target,       color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", detail: "Score: 88% · High confidence" },
                  { event: "policy.evaluated",         time: "14:02:12", icon: Shield,       color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", detail: "5/5 rules passed · Auto-approve" },
                  { event: "recovery.executed",        time: "14:02:14", icon: Zap,          color: "text-jade-400", bg: "bg-jade-500/10 border-jade-500/20", detail: "Backup UPI PSP · Smart retry" },
                  { event: "payment.succeeded",        time: "14:08:43", icon: CheckCircle2, color: "text-jade-300", bg: "bg-jade-500/15 border-jade-500/30", detail: "₹25,000 recovered · +₹22,000 lift" },
                  { event: "audit.recorded",           time: "14:08:44", icon: FileText,     color: "text-ink-300", bg: "bg-base-200 border-base-border", detail: "ev_99201 · immutable log" },
                ].map((ev, i, arr) => (
                  <div key={ev.event} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${ev.bg} shrink-0 mt-2`}>
                        <ev.icon size={13} className={ev.color} />
                      </div>
                      {i < arr.length - 1 && (
                        <div className="w-px flex-1 bg-base-border/50 my-1 min-h-[20px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono text-xs font-bold ${ev.color}`}>{ev.event}</span>
                        <span className="font-mono text-2xs text-ink-500">{ev.time}</span>
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5">{ev.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          FINAL CTA
          ════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 lg:px-10 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[500px] rounded-full bg-jade-500/6 blur-[100px]" />
        </div>

        <Reveal className="max-w-3xl mx-auto space-y-8">
          <span className="badge-violet text-2xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block">
            10 · Enter PayPilot
          </span>
          <h2 className="font-hero text-ink-0">
            Your revenue is<br />
            <span className="gradient-text-dramatic">waiting to be recovered.</span>
          </h2>
          <p className="text-base text-ink-300 max-w-md mx-auto">
            Stop watching failed payments silently disappear. Enter PayPilot and see exactly what you're losing — and exactly how to get it back.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/command-center"
              className="btn-glow-violet inline-flex items-center gap-2.5 rounded-2xl bg-violet-600 px-10 py-4 text-sm font-black text-white shadow-2xl shadow-violet-600/30">
              ENTER PAYPILOT
              <ArrowRight size={16} />
            </Link>
            <Link href="/login"
              className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-semibold">
              Sign In
            </Link>
          </div>
          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-base-border/40">
            {[
              { icon: Lock,      label: "End-to-end encrypted" },
              { icon: Shield,    label: "Policy-governed" },
              { icon: FileText,  label: "Immutable audit trail" },
              { icon: Eye,       label: "Full transparency" },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-2 text-xs text-ink-500">
                <t.icon size={13} className="text-ink-500" />
                {t.label}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-base-border/50 px-6 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl overflow-hidden bg-[#0D0B1E] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="PayPilot" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-bold text-ink-300">PAYPILOT</span>
            <span className="text-2xs text-ink-500">Autonomous Revenue Recovery Infrastructure</span>
          </div>
          <div className="flex items-center gap-4 text-2xs text-ink-500">
            <Link href="/login" className="hover:text-ink-300 transition-colors">Sign In</Link>
            <Link href="/command-center" className="hover:text-ink-300 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight, Activity, Zap, Shield, CheckCircle2,
  AlertTriangle, Sparkles, BarChart3, FileText,
  BrainCircuit, FlaskConical, TrendingUp, Target,
  Lock, Play, Pause,
} from "lucide-react";

/* ═══════════════════════════════════════════
   TYPES & DATA
   ═══════════════════════════════════════════ */

const PIPELINE = [
  { id: 1, label: "Failed",    tag: "DETECTED",  icon: AlertTriangle,  col: "#F0554C", bg: "rgba(240,85,76,0.12)",   title: "UPI Bank Timeout",              sub: "₹25,000 checkout failed — peak congestion window", meta: [["Amount","₹25,000"],["Error","bank_timeout"],["Gateway","Primary UPI"]] },
  { id: 2, label: "Analysed",  tag: "ML ENGINE", icon: BrainCircuit,   col: "#7C6FF0", bg: "rgba(124,111,240,0.12)", title: "Behavioral Feature Extraction", sub: "Customer LTV, retry history, PSP health evaluated",  meta: [["LTV","₹49,995"],["Retries","0 of 3"],["Churn","Low 0.12"]] },
  { id: 3, label: "Scored",    tag: "HIGH CONF", icon: Target,         col: "#34E8A0", bg: "rgba(52,232,160,0.12)",  title: "88% Recovery Probability",      sub: "Expected recovery ₹22,000 · queue rank #1",          meta: [["Probability","88%"],["Exp. Value","₹22,000"],["Priority","Critical"]] },
  { id: 4, label: "Policy ✓",  tag: "APPROVED",  icon: Shield,         col: "#34E8A0", bg: "rgba(52,232,160,0.12)",  title: "5 Policy Rules Passed",         sub: "Amount within threshold · cooldown satisfied",       meta: [["Retries","0/3 used"],["Cooldown","12h passed"],["Decision","Auto"]] },
  { id: 5, label: "Retrying",  tag: "EXECUTING", icon: Zap,            col: "#FBC66B", bg: "rgba(251,198,107,0.12)", title: "Dynamic Gateway Rerouting",     sub: "Secondary PSP selected · low-friction window",       meta: [["PSP","Backup UPI"],["Method","Smart Retry"],["Status","In Progress"]] },
  { id: 6, label: "Recovered", tag: "SUCCESS ✓", icon: CheckCircle2,   col: "#34E8A0", bg: "rgba(52,232,160,0.15)",  title: "₹25,000 Preserved",             sub: "MRR protected · audit logged · lift recorded",        meta: [["Recovered","₹25,000"],["Net Lift","+₹22,000"],["Audit","ev_99201"]] },
];

/* ═══════════════════════════════════════════
   ANIMATED PARTICLES CANVAS
   ═══════════════════════════════════════════ */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight * 1.2;
    let raf: number;

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight * 1.2;
    };
    window.addEventListener("resize", onResize);

    // Create particles
    const N = Math.min(Math.floor(W / 8), 120);
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      // Alternate between violet and jade tints
      color: Math.random() > 0.6
        ? `rgba(124,111,240,${Math.random() * 0.5 + 0.1})`
        : `rgba(52,232,160,${Math.random() * 0.3 + 0.05})`,
    }));

    const MAX_DIST = 120;

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        // Draw dot
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.strokeStyle = `rgba(124,111,240,${(1 - dist / MAX_DIST) * 0.08})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

/* ═══════════════════════════════════════════
   ANIMATED GRADIENT TEXT
   ═══════════════════════════════════════════ */
function GradientWord({ children, colors }: { children: string; colors: string[] }) {
  return (
    <span
      className="inline-block bg-clip-text text-transparent"
      style={{
        backgroundImage: `linear-gradient(135deg, ${colors.join(", ")})`,
        backgroundSize: "200% 200%",
        animation: "gradient-shift 4s ease infinite",
      }}
    >
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════
   SCROLL REVEAL  (CSS only — no rAF)
   ═══════════════════════════════════════════ */
function Reveal({ children, delay = 0, className = "", from = "bottom" }: {
  children: React.ReactNode; delay?: number; className?: string; from?: "bottom" | "left" | "right";
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); ob.disconnect(); }
    }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const initial = from === "left" ? "translateX(-24px)" : from === "right" ? "translateX(24px)" : "translateY(16px)";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : initial,
        willChange: vis ? "auto" : "opacity, transform",
        transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FLOATING BADGE (orbiting decorations)
   ═══════════════════════════════════════════ */
function FloatBadge({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute glass-card rounded-2xl px-3 py-2 border border-white/8 backdrop-blur-xl shadow-2xl text-xs font-mono font-bold ${className}`}
      style={{ animation: "float 6s ease-in-out infinite", ...style }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep(s => (s + 1) % PIPELINE.length), 2800);
    return () => clearInterval(t);
  }, [playing]);

  // Parallax mouse tracking for hero
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const handle = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
      });
    };
    hero.addEventListener("mousemove", handle);
    return () => hero.removeEventListener("mousemove", handle);
  }, []);

  const cur = PIPELINE[step];
  const CurIcon = cur.icon;

  return (
    <div className="min-h-screen bg-base-0 text-ink-0 overflow-x-hidden font-sans selection:bg-violet-500/30">

      {/* ── Particle field ── */}
      <ParticleField />

      {/* ── Global ambient orbs ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 h-[900px] w-[900px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,111,240,0.12) 0%, transparent 70%)" }} />
        <div className="absolute top-[60vh] -right-40 h-[600px] w-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(52,232,160,0.07) 0%, transparent 70%)" }} />
        <div className="absolute top-[120vh] -left-40 h-[700px] w-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(240,85,76,0.06) 0%, transparent 70%)" }} />
      </div>

      {/* ════════════════════════════════════
          NAVBAR
          ════════════════════════════════════ */}
      <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 lg:px-12 border-b border-white/5 bg-base-0/60 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-2xl overflow-hidden bg-[#0D0B1E] shadow-xl shadow-violet-600/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="PayPilot" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white leading-none">PAYPILOT</div>
            <div className="text-2xs font-mono text-violet-400 tracking-widest uppercase mt-0.5 leading-none">Revenue Engine</div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 text-2xs font-mono text-ink-500">
          {[["DETECT","#s-detect"],["SCORE","#s-score"],["DECIDE","#s-decide"],["RECOVER","#s-recover"],["LEARN","#s-learn"],["AI","#s-ai"]].map(([l,h]) => (
            <a key={h} href={h} className="px-3 py-2 rounded-xl hover:text-violet-400 hover:bg-violet-500/8 transition-all duration-160">{l}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="text-xs font-medium text-ink-400 hover:text-white px-3 py-1.5 rounded-xl transition-colors">Sign in</Link>
          <Link href="/command-center" className="btn-glow-violet inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white">
            Enter PayPilot <ArrowRight size={12} />
          </Link>
        </div>
      </header>

      {/* ════════════════════════════════════
          HERO
          ════════════════════════════════════ */}
      <section ref={heroRef} className="relative z-10 min-h-[92vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-8">

        {/* Parallax glow that follows mouse */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-700 ease-out"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(124,111,240,0.10), transparent 60%)`,
          }}
        />

        {/* Floating decoration badges */}
        <FloatBadge className="top-[18%] left-[8%] text-jade-400 hidden lg:block" style={{ animationDelay: "0s" }}>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse" />₹6.62L Recovered</span>
        </FloatBadge>
        <FloatBadge className="top-[25%] right-[7%] text-violet-400 hidden lg:block" style={{ animationDelay: "2s" }}>
          <span className="flex items-center gap-1.5"><Sparkles size={10} />88% AI Confidence</span>
        </FloatBadge>
        <FloatBadge className="bottom-[22%] left-[6%] text-coral-400 hidden lg:block" style={{ animationDelay: "1s" }}>
          <span className="flex items-center gap-1.5"><AlertTriangle size={10} />168 Active Cases</span>
        </FloatBadge>
        <FloatBadge className="bottom-[28%] right-[8%] text-amber-400 hidden lg:block" style={{ animationDelay: "3s" }}>
          <span className="flex items-center gap-1.5"><Activity size={10} />LIVE Engine</span>
        </FloatBadge>

        {/* Badge pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-1.5 mb-8"
          style={{ animation: "enter 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-jade-400 animate-ping opacity-40" />
            <span className="relative h-2 w-2 rounded-full bg-jade-400 shadow-[0_0_8px_rgba(52,232,160,0.9)]" />
          </span>
          <span className="text-2xs font-mono font-bold tracking-widest text-violet-300 uppercase">
            Autonomous Revenue Recovery · Live Engine
          </span>
        </div>

        {/* Display headline */}
        <div className="max-w-5xl mx-auto space-y-4" style={{ animation: "rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
          <h1 className="font-display leading-none text-white">
            Your revenue<br />
            shouldn't disappear<br />
            because a{" "}
            <GradientWord colors={["#FF9B8D","#F0554C","#7C6FF0","#9C93F5"]}>
              payment failed.
            </GradientWord>
          </h1>
          <p className="max-w-lg mx-auto text-base lg:text-lg text-ink-400 leading-relaxed mt-6">
            PayPilot detects every failed payment, scores recoverability with AI, evaluates merchant policy, and executes smart retries — all in real time.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10" style={{ animation: "rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s both" }}>
          <Link href="/command-center"
            className="btn-glow-violet group inline-flex items-center gap-2.5 rounded-2xl bg-violet-600 px-8 py-4 text-sm font-black text-white shadow-2xl shadow-violet-600/30">
            ENTER PAYPILOT
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#s-detect"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/4 backdrop-blur px-7 py-4 text-sm font-semibold text-ink-300 hover:text-white hover:border-white/20 hover:bg-white/8 transition-all duration-240">
            <Play size={13} /> SEE HOW IT WORKS
          </a>
        </div>

        {/* Metrics strip */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-14" style={{ animation: "rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both" }}>
          {[
            { v: "₹6.62L", l: "RECOVERED",     c: "text-jade-300" },
            { v: "34.2%",  l: "RECOVERY RATE",  c: "text-white" },
            { v: "8.9h",   l: "AVG TIME",        c: "text-amber-400" },
            { v: "₹4.14L", l: "INCREMENTAL LIFT",c: "text-violet-400" },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className={`font-mono text-2xl font-black ${s.c}`}>{s.v}</div>
              <div className="text-2xs text-ink-500 font-mono uppercase tracking-wider mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
          style={{ animation: "float 3s ease-in-out infinite" }}>
          <div className="h-8 w-5 rounded-full border border-ink-500 flex items-start justify-center pt-1.5">
            <div className="h-1.5 w-1 rounded-full bg-ink-400"
              style={{ animation: "float 1.5s ease-in-out infinite" }} />
          </div>
          <span className="text-2xs text-ink-500 font-mono">SCROLL</span>
        </div>
      </section>

      {/* ════════════════════════════════════
          INTERACTIVE PIPELINE
          ════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <span className="badge-violet text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block mb-4">
              Recovery Pipeline
            </span>
            <h2 className="font-section text-white">From failure to recovery<br />in under 9 hours.</h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="card-surface rounded-3xl border border-violet-500/15 bg-base-100/80 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/50">
              {/* Terminal bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-coral-500 opacity-80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500 opacity-80" />
                  <span className="h-3 w-3 rounded-full bg-jade-500 opacity-80" />
                  <span className="ml-3 font-mono text-2xs text-ink-500">paypilot.recovery_engine · live simulation</span>
                </div>
                <button onClick={() => setPlaying(p => !p)}
                  className="flex items-center gap-1.5 text-2xs font-mono text-ink-500 hover:text-ink-300 badge-neutral px-2.5 py-1 rounded-lg transition-colors">
                  {playing ? <><Pause size={9} /> PAUSE</> : <><Play size={9} /> PLAY</>}
                </button>
              </div>

              {/* Step tabs */}
              <div className="grid grid-cols-6 border-b border-base-border">
                {PIPELINE.map((s, i) => {
                  const active = step === i;
                  const done   = i < step;
                  return (
                    <button key={s.id} onClick={() => { setStep(i); setPlaying(false); }}
                      className={`relative flex flex-col items-center gap-1 py-3 px-2 text-center transition-all duration-240 ${
                        active ? "bg-violet-500/10" : done ? "bg-jade-500/5 hover:bg-base-200/50" : "hover:bg-base-200/40"
                      }`}>
                      <span className={`font-mono text-2xs font-black ${active ? "text-violet-400" : done ? "text-jade-500" : "text-ink-500"}`}>0{s.id}</span>
                      <span className={`text-2xs font-bold leading-tight ${active ? "text-white" : "text-ink-400"}`}>{s.label}</span>
                      {active && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />}
                      {done  && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-jade-500/40" />}
                    </button>
                  );
                })}
              </div>

              {/* Active step */}
              <div key={cur.id} className="p-6 flex flex-col sm:flex-row gap-6 items-start animate-enter">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: cur.bg, border: `1px solid ${cur.col}30` }}>
                      <CurIcon size={18} style={{ color: cur.col }} />
                    </div>
                    <span className="text-2xs font-mono font-black px-2.5 py-1 rounded-lg"
                      style={{ background: cur.bg, color: cur.col, border: `1px solid ${cur.col}40` }}>
                      {cur.tag}
                    </span>
                    <span className="font-mono text-2xs text-ink-500">Step {cur.id} of 6</span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight">{cur.title}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{cur.sub}</p>
                  <div className="h-1 w-full rounded-full bg-base-300/50 overflow-hidden mt-2">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(cur.id / 6) * 100}%`, background: `linear-gradient(90deg, #5F52D6, ${cur.col})` }} />
                  </div>
                </div>
                <div className="shrink-0 w-full sm:w-56 grid grid-cols-3 sm:grid-cols-1 gap-2">
                  {cur.meta.map(([k, v]) => (
                    <div key={k} className="glass-card rounded-xl p-3">
                      <p className="text-2xs font-mono text-ink-500 uppercase">{k}</p>
                      <p className="font-mono text-sm font-black text-white mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline connector row */}
              <div className="px-6 pb-5">
                <div className="flex items-center">
                  {PIPELINE.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1 min-w-0">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-2xs font-mono font-black shrink-0 transition-all duration-400`}
                        style={{
                          background: i < step ? "#22C08A" : i === step ? "#7C6FF0" : "hsl(var(--base-300))",
                          color: i <= step ? "white" : "hsl(var(--ink-500))",
                          boxShadow: i === step ? "0 0 16px rgba(124,111,240,0.5)" : i < step ? "0 0 8px rgba(34,192,138,0.4)" : "none",
                        }}>
                        {i < step ? <CheckCircle2 size={13} /> : s.id}
                      </div>
                      {i < 5 && (
                        <div className="flex-1 h-px mx-1 transition-all duration-700"
                          style={{ background: i < step ? "rgba(34,232,160,0.5)" : "hsl(var(--base-border))" }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 01 — DETECT
          ════════════════════════════════════ */}
      <section id="s-detect" className="relative z-10 py-28 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <Reveal className="space-y-6">
            <span className="badge-coral text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-coral-400" />01 · Revenue Leaks
            </span>
            <h2 className="font-section text-white">
              Failed payments are your biggest invisible cash leak.
            </h2>
            <p className="text-base text-ink-400 leading-relaxed">
              Up to 19% of SaaS recurring revenue is lost not because customers cancelled — but because of bank timeouts, expired mandates, and gateway rate limits.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="card-surface rounded-2xl p-5 space-y-1.5 card-glow-coral">
                <p className="text-2xs font-mono text-ink-500 uppercase">Avg Leak Rate</p>
                <p className="font-mono text-3xl font-black text-coral-400">19.2%</p>
                <p className="text-2xs text-ink-500">of total attempt volume</p>
              </div>
              <div className="card-surface rounded-2xl p-5 space-y-1.5 card-glow-amber">
                <p className="text-2xs font-mono text-ink-500 uppercase">Top Cause</p>
                <p className="font-mono text-xl font-black text-amber-400">UPI Timeout</p>
                <p className="text-2xs text-ink-500">NPCI peak congestion</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} from="right">
            <div className="card-surface rounded-3xl border border-coral-500/20 overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-coral-400 animate-pulse" />
                  <span className="text-2xs font-mono text-ink-300 font-bold">LIVE EVENT STREAM</span>
                </div>
                <span className="text-2xs font-mono text-ink-500">webhook ingest</span>
              </div>
              <div className="p-4 space-y-2 font-mono">
                {[
                  { type: "payment.failed",        id: "pay_90218", amount: "₹45,000", code: "bank_timeout",    c: "text-coral-400",  bg: "bg-coral-500/8 border-coral-500/20" },
                  { type: "subscription.past_due", id: "sub_10928", amount: "₹25,000", code: "card_declined",   c: "text-amber-400",  bg: "bg-amber-500/8 border-amber-500/20" },
                  { type: "checkout.abandoned",    id: "chk_44012", amount: "₹9,999",  code: "session_timeout", c: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/20" },
                  { type: "payment.failed",        id: "pay_90305", amount: "₹18,500", code: "insufficient",    c: "text-coral-400",  bg: "bg-coral-500/8 border-coral-500/20" },
                ].map((ev, i) => (
                  <div key={ev.id}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${ev.bg}`}
                    style={{ animation: `enter 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both` }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-2xs font-bold ${ev.c} truncate`}>{ev.type}</span>
                      <span className="text-2xs text-ink-500 hidden sm:block">{ev.id}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-2xs text-ink-500">{ev.code}</span>
                      <span className="text-xs font-black text-white">{ev.amount}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 text-2xs text-ink-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse" />
                  PayPilot watching all payment events in real time
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 02 — SCORE
          ════════════════════════════════════ */}
      <section id="s-score" className="relative z-10 py-28 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <Reveal from="left">
            <div className="card-surface rounded-3xl border border-jade-500/20 overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={12} className="text-jade-400" />
                  <span className="text-2xs font-mono text-ink-300 font-bold">RECOVERABILITY ENGINE</span>
                </div>
                <span className="badge-jade text-2xs font-mono font-black px-2 py-0.5 rounded-md">88% SCORE</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Animated ring */}
                <div className="flex items-center justify-center py-4 relative">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--base-300))" strokeWidth="8" />
                    <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray="314" strokeDashoffset={314 * (1 - 0.88)}
                      style={{ stroke: "url(#scoreGrad)", transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22C08A" />
                        <stop offset="100%" stopColor="#34E8A0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl font-black text-jade-300">88%</span>
                    <span className="text-2xs text-ink-500 font-mono">RECOVERY</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { l: "Prior recovery success",      d: "+22%", pos: true  },
                    { l: "High account LTV ₹49.9K",     d: "+18%", pos: true  },
                    { l: "First retry (0 prior)",        d: "+14%", pos: true  },
                    { l: "UPI bank timeout failure",     d: "−8%",  pos: false },
                    { l: "Peak congestion window",       d: "−6%",  pos: false },
                  ].map((sig, i) => (
                    <div key={sig.l} className="flex items-center justify-between glass-card rounded-xl px-4 py-2.5"
                      style={{ animation: `enter 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}>
                      <span className="text-xs text-ink-400">{sig.l}</span>
                      <span className={`font-mono text-xs font-black ${sig.pos ? "text-jade-300" : "text-coral-400"}`}>{sig.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="space-y-6">
            <span className="badge-jade text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-jade-400" />02 · Understand
            </span>
            <h2 className="font-section text-white">Not all failed payments are worth chasing.</h2>
            <p className="text-base text-ink-400 leading-relaxed">
              PayPilot's AI evaluates customer LTV, retry history, payment method signals, and PSP health to score each failure — before committing a single retry.
            </p>
            <ul className="space-y-3">
              {["Probabilistic recovery scoring per payment","Explainable signal breakdown — not a black box","Ranked opportunity queue by expected value","High / medium / low confidence tiers"].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-400">
                  <CheckCircle2 size={15} className="text-jade-400 mt-0.5 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 03 — DECIDE
          ════════════════════════════════════ */}
      <section id="s-decide" className="relative z-10 py-28 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <Reveal className="space-y-6">
            <span className="badge-amber text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />03 · Decide
            </span>
            <h2 className="font-section text-white">Policy guardrails protect your customer relationships.</h2>
            <p className="text-base text-ink-400 leading-relaxed">
              Every recovery action passes through your merchant policy matrix — enforcing amount limits, retry cooldowns, contact frequency caps, and approval workflows.
            </p>
            {/* Flow visualization */}
            <div className="space-y-2 pt-2">
              {[
                { l: "TRIGGER",   v: "payment.failed",             c: "#F0554C" },
                { l: "CONDITION", v: "recovery_prob > 70%",         c: "#7C6FF0" },
                { l: "POLICY",    v: "retries < 3 · amt ≤ ₹25k",   c: "#FBC66B" },
                { l: "ACTION",    v: "auto_retry via backup PSP",   c: "#34E8A0" },
                { l: "OUTCOME",   v: "audit_log + lift_record",     c: "#9C93F5" },
              ].map((row, i) => (
                <div key={row.l} className="flex items-center gap-3">
                  <div className="w-20 text-2xs font-mono font-black text-ink-500 text-right shrink-0">{row.l}</div>
                  <div className="h-px w-4 bg-base-border shrink-0" />
                  <div className="glass-card rounded-2xl px-4 py-2.5 flex-1 font-mono text-xs font-black"
                    style={{ color: row.c }}>{row.v}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} from="right">
            <div className="card-surface rounded-3xl border border-amber-500/20 overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-amber-400" />
                  <span className="text-2xs font-mono text-ink-300 font-bold">POLICY CHECK</span>
                </div>
                <span className="badge-jade text-2xs font-mono font-black px-2 py-0.5 rounded-md">5/5 PASSED</span>
              </div>
              <div className="p-5 space-y-2">
                {[
                  { rule: "Max retry limit",      detail: "0 of 3 retries used"          },
                  { rule: "Auto-approval amount", detail: "₹25,000 ≤ ₹25,000 threshold" },
                  { rule: "Retry cooldown",       detail: "12h elapsed · satisfied"      },
                  { rule: "Contact frequency",    detail: "2 of 3 contacts this week"    },
                  { rule: "Customer flag check",  detail: "No flags on account"         },
                ].map((r, i) => (
                  <div key={r.rule} className="flex items-center justify-between glass-card rounded-2xl px-4 py-3"
                    style={{ animation: `enter 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}>
                    <div>
                      <p className="text-xs font-bold text-white">{r.rule}</p>
                      <p className="text-2xs text-ink-500 mt-0.5">{r.detail}</p>
                    </div>
                    <CheckCircle2 size={16} className="text-jade-400 shrink-0" />
                  </div>
                ))}
                <div className="badge-jade rounded-2xl px-4 py-3 flex items-center justify-between mt-1">
                  <span className="text-xs font-black text-jade-300">Decision: AUTO APPROVE</span>
                  <Zap size={14} className="text-jade-300" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 04 — RECOVER (BIG STAT)
          ════════════════════════════════════ */}
      <section id="s-recover" className="relative z-10 py-28 px-6 lg:px-12 overflow-hidden">
        {/* Background glow */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[600px] w-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(52,232,160,0.08) 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal className="text-center mb-16">
            <span className="badge-jade text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block mb-6">
              04 · Recover
            </span>
            <div className="font-display gradient-text-jade">
              ₹6.62L recovered.
            </div>
            <p className="text-base text-ink-400 mt-6 max-w-md mx-auto">
              Revenue that would have silently disappeared. Recovered by PayPilot's autonomous execution engine.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Recovered",    display: "₹6.62L", color: "stat-glow-jade",   sub: "Verified outcomes",          border: "border-jade-500/20" },
              { label: "Incremental Lift",   display: "₹4.14L", color: "stat-glow-violet", sub: "Above organic 12% baseline", border: "border-violet-500/15" },
              { label: "Recovery Rate",      display: "34.2%",  color: "text-white",        sub: "1 in 3 failures recovered",  border: "border-base-border" },
              { label: "Avg Recovery Time",  display: "8.9h",   color: "stat-glow-amber",   sub: "Failure to resolution",      border: "border-amber-500/15" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 70}>
                <div className={`card-surface rounded-2xl p-6 text-center space-y-2 border ${s.border} card-interactive cursor-default`}>
                  <p className="text-2xs font-mono text-ink-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`font-mono text-3xl font-black ${s.color}`}>{s.display}</p>
                  <p className="text-2xs text-ink-500">{s.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Live queue */}
          <Reveal delay={200}>
            <div className="card-surface rounded-3xl p-6 border border-base-border">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white">Live Recovery Engine — Current Queue</h3>
                <span className="text-2xs font-mono text-jade-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse" />Processing
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {[
                  { state: "Queued",    count: 8,  col: "text-ink-300",   bg: "bg-base-200" },
                  { state: "Analysing", count: 3,  col: "text-violet-400", bg: "bg-violet-500/10" },
                  { state: "Awaiting",  count: 2,  col: "text-amber-400",  bg: "bg-amber-500/10" },
                  { state: "Executing", count: 5,  col: "text-jade-400",   bg: "bg-jade-500/10" },
                  { state: "Recovered", count: 47, col: "text-jade-300",   bg: "bg-jade-500/15" },
                  { state: "Failed",    count: 6,  col: "text-coral-400",  bg: "bg-coral-500/10" },
                  { state: "Escalated", count: 1,  col: "text-amber-500",  bg: "bg-amber-500/10" },
                ].map((s, i) => (
                  <div key={s.state} className={`rounded-2xl ${s.bg} p-3 text-center`}
                    style={{ animation: `enter 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both` }}>
                    <div className={`font-mono text-xl font-black ${s.col}`}>{s.count}</div>
                    <div className="text-2xs text-ink-500 font-mono mt-0.5">{s.state}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 05 — LEARN / EXPERIMENTS
          ════════════════════════════════════ */}
      <section id="s-learn" className="relative z-10 py-28 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <Reveal from="left">
            <div className="card-surface rounded-3xl border border-violet-500/20 overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                <div className="flex items-center gap-2">
                  <FlaskConical size={12} className="text-violet-400" />
                  <span className="text-2xs font-mono text-ink-300 font-bold">EXPERIMENT: EXP-009</span>
                </div>
                <span className="badge-jade text-2xs font-mono font-black px-2 py-0.5 rounded-md">SIGNIFICANT</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-black text-white">Immediate vs Delayed Retry Timing</p>
                  <p className="text-xs text-ink-400 mt-1">Does delaying retries by 4h improve recovery rate?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Control",   rate: "24.1%", lift: "Baseline",  color: "text-ink-300", bar: "bg-ink-400/50", w: "24.1%" },
                    { label: "Treatment", rate: "38.7%", lift: "+14.6pp",   color: "text-jade-300", bar: "progress-bar-jade", w: "38.7%" },
                  ].map(v => (
                    <div key={v.label} className="glass-card rounded-2xl p-4 space-y-2">
                      <p className="text-2xs font-mono text-ink-500 uppercase">{v.label}</p>
                      <p className={`font-mono text-2xl font-black ${v.color}`}>{v.rate}</p>
                      <p className={`text-xs font-bold ${v.color}`}>{v.lift}</p>
                      <div className="h-1.5 rounded-full bg-base-300/50">
                        <div className={`h-1.5 rounded-full ${v.bar}`} style={{ width: v.w }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-base-border/60 text-center">
                  {[
                    { v: "+60.6%", l: "RELATIVE LIFT", c: "text-jade-300" },
                    { v: "1,247",  l: "SAMPLE SIZE",   c: "text-white" },
                    { v: "97.2%",  l: "CONFIDENCE",    c: "text-violet-400" },
                  ].map(m => (
                    <div key={m.l}>
                      <p className={`font-mono text-base font-black ${m.c}`}>{m.v}</p>
                      <p className="text-2xs text-ink-500 font-mono">{m.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="space-y-6">
            <span className="badge-violet text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />05 · Learn
            </span>
            <h2 className="font-section text-white">Continuous experimentation compounds recovery.</h2>
            <p className="text-base text-ink-400 leading-relaxed">
              PayPilot runs controlled A/B tests across retry timing, gateway sequencing, and intervention strategies — so every recovery strategy gets provably better over time.
            </p>
            <ul className="space-y-3">
              {["Randomized controlled trial design","Statistical significance tracking","Incremental lift measurement","Strategy promotion when significant"].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-400">
                  <CheckCircle2 size={15} className="text-violet-400 mt-0.5 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 06 — AI ANALYST
          ════════════════════════════════════ */}
      <section id="s-ai" className="relative z-10 py-28 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <Reveal className="space-y-6">
            <span className="badge-violet text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />06 · AI Analyst
            </span>
            <h2 className="font-section text-white">Ask anything. Get financially grounded answers.</h2>
            <p className="text-base text-ink-400 leading-relaxed">
              PayPilot's Revenue Analyst is not a generic chatbot — it's a tool-backed AI that queries your actual payment data, risk scores, and audit trail to answer precise revenue questions.
            </p>
            <div className="space-y-2 pt-2">
              {[
                "What's my biggest revenue risk right now?",
                "Which customers are likely to churn next week?",
                "Why did recovery rate drop this period?",
                "Which retry strategy has the highest lift?",
              ].map(q => (
                <div key={q} className="glass-card rounded-2xl px-4 py-3 flex items-center gap-2.5">
                  <Sparkles size={12} className="text-violet-400 shrink-0" />
                  <span className="text-xs text-ink-400">{q}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} from="right">
            <div className="card-surface rounded-3xl border border-violet-500/20 overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between px-5 py-3 border-b border-base-border bg-base-50/60">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-violet-400" />
                  <span className="text-2xs font-mono text-ink-300 font-bold">PAYPILOT REVENUE ANALYST</span>
                </div>
                <span className="badge-jade text-2xs font-mono font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse" />ACTIVE
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                      <Sparkles size={12} className="text-violet-400" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="text-xs text-ink-400 leading-relaxed">
                        <span className="font-bold text-white">3 things need your attention</span> — ₹2.4L at high-confidence risk, 2 high-value customers with elevated churn scores, and EXP-009 ready for promotion with 97.2% confidence.
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { l: "At Risk",    v: "₹2.4L",  c: "text-coral-400" },
                          { l: "Recoverable",v: "₹1.8L",  c: "text-jade-300" },
                          { l: "Confidence", v: "High",   c: "text-violet-400" },
                        ].map(m => (
                          <div key={m.l} className="bg-base-200/60 rounded-xl p-2 text-center">
                            <p className={`font-mono text-sm font-black ${m.c}`}>{m.v}</p>
                            <p className="text-2xs text-ink-500 mt-0.5">{m.l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-violet-500/8 border border-violet-500/15">
                  <BarChart3 size={11} className="text-violet-400 shrink-0" />
                  <span className="text-2xs font-mono text-violet-400">get_revenue_summary(days=30)</span>
                  <CheckCircle2 size={11} className="text-jade-400 ml-auto shrink-0" />
                </div>
                <div className="flex items-center gap-2 glass-card rounded-2xl px-4 py-3">
                  <span className="text-xs text-ink-500 flex-1">Ask about your revenue…</span>
                  <div className="h-6 w-6 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <ArrowRight size={11} className="text-violet-400" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════
          FINAL CTA
          ════════════════════════════════════ */}
      <section className="relative z-10 py-36 px-6 text-center overflow-hidden">
        {/* Dramatic radial burst */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[800px] w-[800px] rounded-full opacity-80"
            style={{ background: "radial-gradient(circle, rgba(124,111,240,0.12) 0%, rgba(52,232,160,0.06) 40%, transparent 70%)" }} />
        </div>
        {/* Grid lines radiating from center */}
        <div aria-hidden className="absolute inset-0 surface-grid opacity-20 pointer-events-none" />

        <Reveal className="max-w-3xl mx-auto space-y-8 relative z-10">
          <span className="badge-violet text-2xs font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block">
            10 · Enter PayPilot
          </span>
          <h2 className="font-hero text-white">
            Your revenue is<br />
            <GradientWord colors={["#FFFFFF","#C4B8FF","#9C93F5","#34E8A0"]}>
              waiting to be recovered.
            </GradientWord>
          </h2>
          <p className="text-base text-ink-400 max-w-md mx-auto">
            Stop watching failed payments silently disappear. Enter PayPilot and see exactly what you're losing — and exactly how to get it back.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/command-center"
              className="btn-glow-violet group inline-flex items-center gap-3 rounded-2xl bg-violet-600 px-12 py-5 text-base font-black text-white shadow-2xl shadow-violet-600/40">
              ENTER PAYPILOT
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1.5" />
            </Link>
            <Link href="/login"
              className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-8 py-5 text-sm font-bold">
              Sign In
            </Link>
          </div>
          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/5">
            {[
              { icon: Lock,      label: "End-to-end encrypted" },
              { icon: Shield,    label: "Policy-governed" },
              { icon: FileText,  label: "Immutable audit trail" },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-2 text-xs text-ink-500">
                <t.icon size={13} className="text-ink-500" />{t.label}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl overflow-hidden bg-[#0D0B1E]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="PayPilot" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-black text-ink-300">PAYPILOT</span>
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

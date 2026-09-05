"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit, Check, Send, Sparkles, Zap, TrendingUp,
  Activity, BarChart3, ShieldAlert, Users, ArrowRight,
  RefreshCw, Target, FileText, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { ease, spring } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */
interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  toolsUsed?: string[];
}

/* ── Suggested prompts ─────────────────────────────── */
const SUGGESTED_PROMPTS = [
  { icon: TrendingUp,  label: "Biggest revenue risk",            q: "What is the biggest revenue risk right now?" },
  { icon: Activity,    label: "Recovery first priorities",       q: "Which payments should I recover first?" },
  { icon: Users,       label: "Churn exposure",                  q: "Which customers are most likely to churn?" },
  { icon: BarChart3,   label: "Recovery rate drivers",           q: "Why is the recovery rate at its current level?" },
  { icon: ShieldAlert, label: "Best recovery strategy",          q: "Which recovery strategy has the highest lift?" },
  { icon: FileText,    label: "This week's recovered revenue",   q: "How much revenue was recovered this week?" },
];

/* ── Thinking animation ────────────────────────────── */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 text-xs text-violet-300 font-mono">
      <span>Analysing live telemetry</span>
      <span className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400"
            style={{ animation: "thinking-dot 1s ease-in-out infinite", animationDelay: `${i * 0.16}s` }}/>
        ))}
      </span>
    </div>
  );
}

/* ── Tool chip ─────────────────────────────────────── */
function ToolChip({ name, done }: { name: string; done?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-2xs font-mono transition-all",
      done
        ? "badge-jade"
        : "border-violet-500/30 bg-violet-500/10 text-violet-300"
    )}>
      {done
        ? <Check size={10}/>
        : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400"/>
      }
      {done ? name : `${name.replaceAll("_"," ")}…`}
    </span>
  );
}

/* ── Streaming text ────────────────────────────────── */
function StreamingText({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [shown,  setShown]  = useState(reduced ? text : "");

  useEffect(() => {
    if (reduced) { setShown(text); return; }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += Math.max(1, Math.ceil(text.length / 38));
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 12);
    return () => window.clearInterval(id);
  }, [text, reduced]);

  return <div className="whitespace-pre-wrap leading-relaxed">{shown}</div>;
}

/* ── Main component ────────────────────────────────── */
export default function CopilotClient() {
  const searchParams = useSearchParams();
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [pendingTools, setPendingTools] = useState<string[]>([]);
  const autoSentRef = useRef(false);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const reduced     = useReducedMotion();

  /* Auto-scroll on new message */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(seed?: string) {
    const userMsg = (seed ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    setPendingTools(["revenue_summary", "risk_distribution"]);

    try {
      const res  = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? "Copilot failed");
      const tools: string[] = data.tools_used ?? [];
      setPendingTools(tools.length ? tools : ["revenue_summary"]);
      await new Promise(r => setTimeout(r, 200));
      setMessages(m => [...m, { role: "assistant", text: data.reply, toolsUsed: tools }]);
    } catch {
      setMessages(m => [
        ...m,
        { role: "assistant", text: "Unable to reach the PayPilot AI analyst right now. Please try again." },
      ]);
    } finally {
      setPendingTools([]);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  /* Auto-send on mount or URL param */
  useEffect(() => {
    if (autoSentRef.current) return;
    const q = searchParams.get("q");
    if (q) {
      autoSentRef.current = true;
      send(q);
    } else if (messages.length === 0) {
      autoSentRef.current = true;
      send("Give me a brief revenue intelligence summary. What are the 3 most important things that need attention right now?");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex h-[calc(100vh-6.5rem)] max-w-4xl mx-auto flex-col gap-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0 pb-3 border-b border-base-border/60">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-violet-600/30">
              <Sparkles size={18} className="text-white"/>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-jade-400 border-2 border-base-0 shadow-sm"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-ink-0">PayPilot Revenue Analyst</h1>
              <span className="badge-jade text-2xs font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-400 animate-pulse"/>
                ACTIVE
              </span>
            </div>
            <p className="text-2xs text-ink-500 font-mono mt-0.5">Tool-backed autonomous financial reasoning · live telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/revenue/opportunities"
            className="badge-jade hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition hover:opacity-80">
            <TrendingUp size={12}/> Opportunities
          </Link>
          <Link href="/revenue/recovery"
            className="btn-glow-violet inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">
            <Zap size={12}/> Execute Recovery
          </Link>
        </div>
      </div>

      {/* ── Message thread ── */}
      <div ref={scrollRef}
        className="flex-1 overflow-y-auto card-surface rounded-2xl bg-base-100/70 backdrop-blur p-5">

        {/* Welcome state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full py-16 space-y-5">
            <div className="relative">
              <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-600/30">
                <Sparkles size={28} className="text-white"/>
              </div>
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-jade-400 border-2 border-base-0 shadow-sm"/>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-bold text-ink-0">PayPilot Revenue Analyst</p>
              <p className="text-xs text-ink-400 max-w-xs">
                Connecting to live payment telemetry, risk scores, and recovery data…
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="h-2 w-2 rounded-full bg-violet-400"
                  style={{ animation: "thinking-dot 1s ease-in-out infinite", animationDelay: `${i * 0.16}s` }}/>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={`${m.role}-${i}-${m.text.slice(0,12)}`}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? ease : spring}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* AI avatar */}
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0 mt-1 mr-2.5">
                    <Sparkles size={13} className="text-violet-400"/>
                  </div>
                )}

                <div className={cn(
                  "max-w-[82%] rounded-2xl px-5 py-4 text-sm",
                  m.role === "user"
                    ? "bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/20"
                    : "border border-base-border bg-base-50/80 text-ink-0 backdrop-blur"
                )}>
                  {/* Text — stream only last AI message */}
                  {m.role === "assistant" && i === messages.length - 1 && !loading
                    ? <StreamingText text={m.text}/>
                    : <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  }

                  {/* Tool chips */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-base-border/50 space-y-2">
                      <span className="text-2xs font-mono text-ink-500 uppercase tracking-wider">
                        Tools invoked
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {m.toolsUsed.map(t => <ToolChip key={t} name={t} done/>)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading state */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0 mt-1">
                <Sparkles size={13} className="text-violet-400 animate-pulse"/>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/6 px-5 py-4 space-y-3">
                <ThinkingDots/>
                {pendingTools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pendingTools.map(t => <ToolChip key={t} name={t}/>)}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Suggestion chips ── */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {SUGGESTED_PROMPTS.map(p => {
          const Icon = p.icon;
          return (
            <button key={p.q} onClick={() => send(p.q)} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/6 px-3.5 py-1.5 text-2xs font-semibold text-violet-400 transition-all hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/12 hover:shadow-[0_0_16px_rgba(124,111,240,0.15)] disabled:opacity-40">
              <Icon size={11}/>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── Input bar ── */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about revenue risk, churn, recovery performance, strategies…"
            className="w-full rounded-2xl border border-base-border bg-base-100 px-5 py-3.5 text-sm text-ink-0 outline-none transition placeholder:text-ink-500 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 pr-12"
            aria-label="Ask the Revenue Analyst"
          />
          {input && (
            <button onClick={() => setInput("")}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 text-xs font-mono px-1">
              esc
            </button>
          )}
        </div>
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="btn-glow-violet flex items-center justify-center h-[50px] w-[50px] rounded-2xl bg-violet-600 text-white transition disabled:opacity-40 shrink-0 shadow-lg shadow-violet-600/20">
          <Send size={16}/>
        </button>
      </div>
    </div>
  );
}

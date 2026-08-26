"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Check, Send, Sparkles } from "lucide-react";
import { ease, spring } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  toolsUsed?: string[];
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 text-sm text-violet-300">
      <span>Thinking</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-violet-400"
            style={{
              animation: "thinking-dot 1s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </span>
    </div>
  );
}

function ToolChip({ name, done }: { name: string; done?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
        done
          ? "border-jade-500/25 bg-jade-500/10 text-jade-300"
          : "border-violet-500/25 bg-violet-500/10 text-violet-300"
      )}
    >
      {done ? <Check size={11} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />}
      {done ? name : `checking ${name.replaceAll("_", " ")}…`}
    </span>
  );
}

function StreamingText({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? text : "");

  useEffect(() => {
    if (reduced) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += Math.max(1, Math.ceil(text.length / 40));
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 18);
    return () => window.clearInterval(id);
  }, [text, reduced]);

  return <>{shown}</>;
}

export default function CopilotClient() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingTools, setPendingTools] = useState<string[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setInput(q);
  }, [searchParams]);

  async function send(seed?: string) {
    const userMsg = (seed ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    setPendingTools(["revenue_summary", "risk_distribution"]);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? "Copilot failed");
      const tools: string[] = data.tools_used ?? [];
      setPendingTools(tools.length ? tools : ["tools"]);
      await new Promise((r) => setTimeout(r, 280));
      setMessages((m) => [...m, { role: "assistant", text: data.reply, toolsUsed: tools }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Something went wrong reaching the copilot." },
      ]);
    } finally {
      setPendingTools([]);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl flex-col">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-2 text-violet-400 shadow-card">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink-0">AI Copilot</h1>
            <p className="text-sm text-ink-300">Tool-backed revenue recovery analyst</p>
          </div>
        </div>
        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          Live tools
        </span>
      </div>

      <div className="card-surface mb-4 flex-1 overflow-y-auto rounded-lg bg-base-100/70 p-5 backdrop-blur">
        {messages.length === 0 && !loading && (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              "What should I recover first?",
              "Show the risk distribution",
              "Who are my top customers?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => send(prompt)}
                className="card-surface card-interactive rounded-lg p-4 text-left text-sm text-ink-300 hover:border-violet-500/40 hover:text-ink-0"
              >
                <Sparkles size={14} className="mb-3 text-violet-400" />
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={`${m.role}-${i}-${m.text.slice(0, 12)}`}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? ease : spring}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={cn(
                    "max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-card",
                    m.role === "user"
                      ? "bg-violet-500 text-white"
                      : "border border-base-border bg-base-100 text-ink-0"
                  )}
                >
                  {m.role === "assistant" && i === messages.length - 1 && !loading ? (
                    <StreamingText text={m.text} />
                  ) : (
                    m.text
                  )}
                  {m.toolsUsed && m.toolsUsed.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.toolsUsed.map((t) => (
                        <ToolChip key={t} name={t} done />
                      ))}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading ? (
            <div className="space-y-3">
              <ThinkingDots />
              <div className="flex flex-wrap gap-1.5">
                {pendingTools.map((t) => (
                  <ToolChip key={t} name={t} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask PayPilot..."
          className="flex-1 rounded-lg border border-base-border bg-base-100 px-4 py-3 text-sm text-ink-0 shadow-card outline-none transition focus:border-violet-500"
        />
        <button
          onClick={() => send()}
          className="rounded-lg bg-violet-500 px-4 py-3 text-white shadow-card transition hover:-translate-y-0.5 hover:bg-violet-600"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

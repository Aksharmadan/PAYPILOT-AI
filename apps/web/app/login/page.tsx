"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Sparkles, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@paypilot.dev");
  const [password, setPassword] = useState("paypilot-demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      if (!res.ok) throw new Error("Invalid credentials");
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not sign in. Check the email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-base-50 text-ink-0">
      <div className="surface-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="animate-rise">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jade-500 text-sm font-bold text-base-0 shadow-card">
              P
            </div>
            <div>
              <p className="font-semibold tracking-tight">PayPilot AI</p>
              <p className="text-xs text-ink-300">Autonomous revenue recovery</p>
            </div>
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-normal text-ink-0">
            Recover revenue with explainable AI and bounded automation.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink-300">
            Detect money at risk, rank the best interventions, route high-value cases to approval, and measure what was actually recovered.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {[
              ["489", "live opportunities"],
              ["₹63K", "expected recovery"],
              ["0.89", "heldout F1"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-base-border bg-base-100/80 p-4 shadow-card backdrop-blur">
                <p className="font-mono text-2xl text-ink-0">{value}</p>
                <p className="mt-1 text-xs text-ink-300">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-enter rounded-lg border border-base-border bg-base-100/90 p-6 shadow-card backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-ink-300">Demo credentials are prefilled.</p>
            </div>
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-2 text-violet-400">
              <LockKeyhole size={18} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-base-border bg-base-50 px-3 py-3 text-sm text-ink-0 outline-none transition focus:border-jade-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-lg border border-base-border bg-base-50 px-3 py-3 text-sm text-ink-0 outline-none transition focus:border-jade-500"
              />
            </label>
            {error && <p className="text-sm text-coral-400">{error}</p>}
            <button
              onClick={submit}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-jade-500 px-4 py-3 text-sm font-medium text-base-0 transition hover:-translate-y-0.5 hover:bg-jade-400 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Enter Command Center"}
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-ink-300">
            <div className="rounded-lg border border-base-border bg-base-50 p-3">
              <Sparkles size={14} className="mb-2 text-violet-400" />
              Tool-backed Copilot
            </div>
            <div className="rounded-lg border border-base-border bg-base-50 p-3">
              <TrendingUp size={14} className="mb-2 text-jade-400" />
              Live recovery data
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

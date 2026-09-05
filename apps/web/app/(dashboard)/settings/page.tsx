"use client";

import { useEffect, useState } from "react";
import { KeyRound, Palette, ShieldCheck, UserRound, Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";
import { ease, spring } from "@/lib/motion";

interface PolicySettings {
  max_retry_count: number;
  retry_cooldown_hours: number;
  auto_amount_limit: number;
  approval_amount_limit: number;
  contact_limit_per_customer: number;
  min_confidence_for_auto: number;
}

export default function SettingsPage() {
  const [policy, setPolicy] = useState<PolicySettings>({
    max_retry_count: 3,
    retry_cooldown_hours: 12,
    auto_amount_limit: 5000,
    approval_amount_limit: 25000,
    contact_limit_per_customer: 3,
    min_confidence_for_auto: 0.7,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/policy");
        if (!res.ok) throw new Error("Failed to load policy");
        const data = await res.json();
        setPolicy(data);
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Failed to load recovery settings." });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      if (!res.ok) throw new Error("Failed to save policy");
      const data = await res.json();
      setPolicy(data);
      setMessage({ type: "success", text: "Recovery policy updated successfully!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-300">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-0">Settings</h1>
        </div>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-jade-500/30 bg-jade-500/10 text-jade-300"
              : "border-coral-500/30 bg-coral-500/10 text-coral-300"
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
        {/* Merchant Profile */}
        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <UserRound size={16} className="text-jade-400" />
            <h2 className="text-sm font-medium text-ink-0">Merchant Profile</h2>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-ink-500">Workspace</span>
              <input
                disabled
                className="mt-2 w-full rounded-lg border border-base-border bg-base-50/50 px-3 py-2.5 text-sm text-ink-400 outline-none cursor-not-allowed"
                value="Demo Merchant"
              />
            </label>
            <label className="block">
              <span className="text-xs text-ink-500">Email</span>
              <input
                disabled
                className="mt-2 w-full rounded-lg border border-base-border bg-base-50/50 px-3 py-2.5 text-sm text-ink-400 outline-none cursor-not-allowed"
                value="demo@paypilot.dev"
              />
            </label>
          </div>
        </section>

        {/* Recovery Policy Settings */}
        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-violet-400" />
                <h2 className="text-sm font-medium text-ink-0">Recovery Policy</h2>
              </div>
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300 font-mono">
                Active Rules
              </span>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-base-border pb-3">
                <span className="text-ink-300">Max retry count</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={policy.max_retry_count}
                  onChange={(e) => setPolicy({ ...policy, max_retry_count: parseInt(e.target.value) || 1 })}
                  className="w-20 rounded-md border border-base-border bg-base-50 px-2 py-1 text-right font-mono text-ink-0 outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-base-border pb-3">
                <span className="text-ink-300">Retry cooldown (hours)</span>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={policy.retry_cooldown_hours}
                  onChange={(e) => setPolicy({ ...policy, retry_cooldown_hours: parseInt(e.target.value) || 1 })}
                  className="w-20 rounded-md border border-base-border bg-base-50 px-2 py-1 text-right font-mono text-ink-0 outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-base-border pb-3">
                <span className="text-ink-300">Auto amount limit (₹)</span>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={policy.auto_amount_limit}
                  onChange={(e) => setPolicy({ ...policy, auto_amount_limit: parseFloat(e.target.value) || 0 })}
                  className="w-28 rounded-md border border-base-border bg-base-50 px-2 py-1 text-right font-mono text-ink-0 outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-base-border pb-3">
                <span className="text-ink-300">Escalation threshold (₹)</span>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={policy.approval_amount_limit}
                  onChange={(e) => setPolicy({ ...policy, approval_amount_limit: parseFloat(e.target.value) || 0 })}
                  className="w-28 rounded-md border border-base-border bg-base-50 px-2 py-1 text-right font-mono text-ink-0 outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-base-border pb-3">
                <span className="text-ink-300">Contact cap per customer</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={policy.contact_limit_per_customer}
                  onChange={(e) => setPolicy({ ...policy, contact_limit_per_customer: parseInt(e.target.value) || 1 })}
                  className="w-20 rounded-md border border-base-border bg-base-50 px-2 py-1 text-right font-mono text-ink-0 outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pb-1">
                <span className="text-ink-300">Min auto confidence score</span>
                <input
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={policy.min_confidence_for_auto}
                  onChange={(e) => setPolicy({ ...policy, min_confidence_for_auto: parseFloat(e.target.value) || 0.1 })}
                  className="w-20 rounded-md border border-base-border bg-base-50 px-2 py-1 text-right font-mono text-ink-0 outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-card transition hover:bg-violet-600 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Policy Rules
                </>
              )}
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <Palette size={16} className="text-amber-400" />
            <h2 className="text-sm font-medium text-ink-0">Appearance</h2>
          </div>
          <p className="text-sm leading-6 text-ink-300">
            Use the moon/sun control in the top bar to switch between dark and light mode. Your preference is saved locally.
          </p>
        </section>

        {/* AI Preferences */}
        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound size={16} className="text-coral-400" />
            <h2 className="text-sm font-medium text-ink-0">AI Copilot</h2>
          </div>
          <p className="text-sm leading-6 text-ink-300">
            Copilot works with deterministic, tool-backed actions over your live revenue database. Change parameters in the recovery policy above to guide AI action proposals.
          </p>
        </section>
      </form>
    </div>
  );
}

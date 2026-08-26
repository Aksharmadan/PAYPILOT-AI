import { KeyRound, Palette, ShieldCheck, UserRound } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-ink-300">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-0">Settings</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <UserRound size={16} className="text-jade-400" />
            <h2 className="text-sm font-medium text-ink-0">Merchant Profile</h2>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-ink-500">Workspace</span>
              <input className="mt-2 w-full rounded-lg border border-base-border bg-base-50 px-3 py-2.5 text-sm text-ink-0 outline-none" defaultValue="Demo Merchant" />
            </label>
            <label className="block">
              <span className="text-xs text-ink-500">Email</span>
              <input className="mt-2 w-full rounded-lg border border-base-border bg-base-50 px-3 py-2.5 text-sm text-ink-0 outline-none" defaultValue="demo@paypilot.dev" />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck size={16} className="text-violet-400" />
            <h2 className="text-sm font-medium text-ink-0">Recovery Policy</h2>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ["Max retry count", "3"],
              ["Retry cooldown", "12 hours"],
              ["Auto amount limit", "₹5,000"],
              ["Escalation threshold", "₹25,000"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-base-border pb-3 last:border-0">
                <span className="text-ink-300">{label}</span>
                <span className="font-mono text-ink-0">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <Palette size={16} className="text-amber-400" />
            <h2 className="text-sm font-medium text-ink-0">Appearance</h2>
          </div>
          <p className="text-sm leading-6 text-ink-300">
            Use the moon/sun control in the top bar to switch between dark and light mode. Your preference is saved locally.
          </p>
        </section>

        <section className="rounded-lg border border-base-border bg-base-100 p-5 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound size={16} className="text-coral-400" />
            <h2 className="text-sm font-medium text-ink-0">AI Copilot</h2>
          </div>
          <p className="text-sm leading-6 text-ink-300">
            Copilot works with deterministic PayPilot tools by default. Add an Anthropic key later to enable LLM orchestration over the same safe tools.
          </p>
        </section>
      </div>
    </div>
  );
}

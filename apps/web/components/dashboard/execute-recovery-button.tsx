"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { formatINR } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

// Pipeline stages shown sequentially during execution
const PIPELINE_STAGES = [
  "Validating policy…",
  "Initiating recovery action…",
  "Processing with payment provider…",
  "Recording outcome…",
  "Updating metrics…",
];

interface ExecuteResult {
  outcome: string; // "recovered" | "not_recovered"
  action_status: string;
  amount_at_risk: number;
  expected_recovery_value: number;
}

export function ExecuteRecoveryButton({
  opportunityId,
  expectedRecovery,
}: {
  opportunityId: string;
  expectedRecovery: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "confirming" | "running" | "done" | "failed">("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<ExecuteResult | null>(null);

  async function execute() {
    setPhase("running");
    setStageIndex(0);

    // Animate through pipeline stages
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= PIPELINE_STAGES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    try {
      const res = await fetch(`/api/proxy?path=/opportunities/${opportunityId}/execute`, {
        method: "POST",
      });

      clearInterval(interval);
      setStageIndex(PIPELINE_STAGES.length - 1);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg: string = typeof err.detail === "string" ? err.detail : "Execution failed";
        if (msg.includes("approval_required")) {
          toast({ title: "Approval required", description: "This opportunity must be approved before it can be executed.", tone: "error" });
          setPhase("idle");
          return;
        }
        throw new Error(msg);
      }

      const data: ExecuteResult = await res.json();
      await new Promise((r) => setTimeout(r, 300)); // brief pause for UX
      setResult(data);
      setPhase(data.outcome === "recovered" ? "done" : "failed");

      if (data.outcome === "recovered") {
        toast({
          title: `₹${data.amount_at_risk?.toLocaleString("en-IN") ?? ""} recovered`,
          description: "Recovery action succeeded. Metrics and audit trail updated.",
          tone: "success",
        });
      } else {
        toast({
          title: "Recovery unsuccessful",
          description: "The payment could not be recovered. Check audit trail for details.",
          tone: "error",
        });
      }

      // Refresh the page data
      setTimeout(() => router.refresh(), 800);
    } catch (e: unknown) {
      clearInterval(interval);
      setPhase("failed");
      toast({
        title: "Execution error",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    }
  }

  // Idle — show trigger button
  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("confirming")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-jade-500/30 bg-jade-500/10 px-2.5 py-1.5 text-xs font-semibold text-jade-400 hover:bg-jade-500/20 hover:border-jade-500/50 transition"
      >
        <Zap size={12} />
        Execute
      </button>
    );
  }

  // Confirmation dialog
  if (phase === "confirming") {
    return (
      <div className="rounded-xl border border-jade-500/30 bg-jade-500/5 p-3 space-y-2.5 w-52">
        <p className="text-[11px] font-semibold text-jade-300">Execute recovery?</p>
        <p className="text-[10px] text-ink-400 leading-relaxed">
          Expected: <span className="font-mono font-semibold text-jade-400">{formatINR(expectedRecovery)}</span>
          <br />
          This is a simulated payment environment.
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={execute}
            className="flex-1 rounded-lg bg-jade-500 px-2.5 py-1.5 text-[11px] font-semibold text-base-0 hover:bg-jade-600 transition"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="px-2.5 py-1.5 rounded-lg border border-base-border text-[11px] text-ink-400 hover:text-ink-0 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Running — animated pipeline
  if (phase === "running") {
    return (
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2 w-52">
        <div className="flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin text-violet-400" />
          <p className="text-[11px] font-medium text-violet-300">Executing…</p>
        </div>
        <div className="space-y-1">
          {PIPELINE_STAGES.map((stage, i) => (
            <div
              key={stage}
              className={`flex items-center gap-1.5 text-[10px] transition-all ${
                i < stageIndex
                  ? "text-jade-400"
                  : i === stageIndex
                    ? "text-violet-300"
                    : "text-ink-600"
              }`}
            >
              {i < stageIndex ? (
                <CheckCircle2 size={9} />
              ) : i === stageIndex ? (
                <ChevronRight size={9} className="text-violet-400" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-base-border" />
              )}
              {stage}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Done (recovered)
  if (phase === "done" && result) {
    return (
      <div className="rounded-xl border border-jade-500/30 bg-jade-500/5 p-3 space-y-1.5 w-52">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-jade-400" />
          <p className="text-xs font-bold text-jade-300">RECOVERED</p>
        </div>
        <p className="font-mono text-lg font-bold text-jade-400">
          {formatINR(result.amount_at_risk)}
        </p>
        <p className="text-[10px] text-ink-400">Payment succeeded · Audit recorded</p>
      </div>
    );
  }

  // Failed (not recovered)
  if (phase === "failed") {
    return (
      <div className="rounded-xl border border-coral-500/20 bg-coral-500/5 p-3 space-y-1.5 w-52">
        <div className="flex items-center gap-1.5">
          <XCircle size={14} className="text-coral-400" />
          <p className="text-[11px] font-semibold text-coral-400">Not recovered</p>
        </div>
        <p className="text-[10px] text-ink-400">Outcome recorded in audit trail.</p>
        <button
          type="button"
          onClick={() => { setPhase("idle"); setResult(null); }}
          className="text-[10px] text-ink-500 hover:text-ink-300 transition"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}

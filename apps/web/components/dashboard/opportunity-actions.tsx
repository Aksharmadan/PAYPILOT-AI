"use client";

import { useTransition } from "react";
import { CheckCircle2, Play, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function OpportunityActions({
  id,
  approveAction,
  rejectAction,
  simulateAction,
}: {
  id: string;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  simulateAction: (formData: FormData) => Promise<void>;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();

  function run(kind: "approve" | "reject" | "simulate", action: (fd: FormData) => Promise<void>) {
    const fd = new FormData();
    fd.set("id", id);
    if (kind === "simulate") fd.set("outcome", "success");
    start(async () => {
      try {
        await action(fd);
        toast({
          title:
            kind === "approve"
              ? "Recovery approved"
              : kind === "reject"
                ? "Recovery rejected"
                : "Simulation recorded",
          description:
            kind === "approve"
              ? "Opportunity moved into the recovery queue."
              : kind === "reject"
                ? "Opportunity blocked from automated recovery."
                : "Synthetic success outcome applied for evaluation.",
          tone: kind === "reject" ? "error" : "success",
        });
      } catch {
        toast({
          title: "Action failed",
          description: "Could not update this opportunity. Try again.",
          tone: "error",
        });
      }
    });
  }

  return (
    <div className={`flex justify-end gap-2 ${pending ? "opacity-60" : ""}`}>
      <button
        type="button"
        disabled={pending}
        onClick={() => run("approve", approveAction)}
        className="h-8 w-8 rounded-md border border-base-border bg-base-200 text-ink-300 transition hover:border-jade-500/40 hover:text-jade-300"
        title="Approve"
      >
        <CheckCircle2 size={15} className="mx-auto" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run("reject", rejectAction)}
        className="h-8 w-8 rounded-md border border-base-border bg-base-200 text-ink-300 transition hover:border-coral-500/40 hover:text-coral-400"
        title="Reject"
      >
        <XCircle size={15} className="mx-auto" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run("simulate", simulateAction)}
        className="h-8 w-8 rounded-md border border-jade-500/30 bg-jade-500/10 text-jade-300 transition hover:bg-jade-500/20"
        title="Simulate success"
      >
        <Play size={15} className="mx-auto" />
      </button>
    </div>
  );
}

import { Suspense } from "react";
import CopilotClient from "@/components/dashboard/copilot-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function CopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-[60vh] w-full rounded-lg" />
        </div>
      }
    >
      <CopilotClient />
    </Suspense>
  );
}

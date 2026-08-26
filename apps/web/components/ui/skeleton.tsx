import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md bg-base-200", className)} />;
}

export function TableSkeleton({
  columns,
  rows = 8,
}: {
  columns: Array<{ width: string; align?: "left" | "right" }>;
  rows?: number;
}) {
  return (
    <div className="card-surface overflow-hidden rounded-2xl">
      <div className="sticky top-0 z-[1] grid border-b border-base-border bg-base-100/95 px-5 py-3 backdrop-blur"
        style={{ gridTemplateColumns: columns.map((c) => c.width).join(" ") }}
      >
        {columns.map((col, i) => (
          <Skeleton key={i} className={cn("h-3 w-16", col.align === "right" && "ml-auto")} />
        ))}
      </div>
      <div className="divide-y divide-base-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid items-center px-5 py-4"
            style={{ gridTemplateColumns: columns.map((c) => c.width).join(" ") }}
          >
            {columns.map((col, i) => (
              <Skeleton
                key={i}
                className={cn("h-3", i === 0 ? "w-3/4 max-w-[180px]" : "w-1/2 max-w-[100px]", col.align === "right" && "ml-auto")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommandCenterSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-72" />
      </div>
      <div className="card-surface flex items-center justify-between rounded-2xl p-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-56" />
        </div>
        <Skeleton className="h-28 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-surface rounded-2xl p-5">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-7 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

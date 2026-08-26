import { TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="skeleton-shimmer h-6 w-56 rounded-md bg-base-200" />
      <div className="card-surface rounded-2xl p-5">
        <div className="skeleton-shimmer mb-4 h-2.5 w-full rounded-full bg-base-200" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton-shimmer h-3 w-28 rounded bg-base-200" />
              <div className="skeleton-shimmer h-6 w-24 rounded bg-base-200" />
            </div>
          ))}
        </div>
      </div>
      <TableSkeleton
        columns={[
          { width: "0.7fr" },
          { width: "0.8fr", align: "right" },
          { width: "0.8fr" },
          { width: "0.7fr", align: "right" },
          { width: "1.4fr" },
        ]}
      />
    </div>
  );
}

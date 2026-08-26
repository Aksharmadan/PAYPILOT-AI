import { TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="space-y-2">
        <div className="skeleton-shimmer h-6 w-40 rounded-md bg-base-200" />
        <div className="skeleton-shimmer h-4 w-24 rounded-md bg-base-200" />
      </div>
      <TableSkeleton
        columns={[
          { width: "1.4fr" },
          { width: "0.8fr" },
          { width: "0.7fr" },
          { width: "0.6fr" },
          { width: "0.8fr", align: "right" },
          { width: "0.7fr", align: "right" },
        ]}
      />
    </div>
  );
}

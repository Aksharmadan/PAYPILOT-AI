import { TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="skeleton-shimmer h-6 w-44 rounded-md bg-base-200" />
      <TableSkeleton
        columns={[
          { width: "1.2fr" },
          { width: "0.8fr" },
          { width: "0.7fr", align: "right" },
          { width: "0.8fr", align: "right" },
        ]}
      />
    </div>
  );
}

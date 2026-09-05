export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-base-200" />
        <div className="h-8 w-64 rounded-lg bg-base-200" />
      </div>
      {/* Hero skeleton */}
      <div className="grid grid-cols-[1.25fr_0.75fr] gap-4">
        <div className="h-56 rounded-2xl bg-base-100 border border-base-border" />
        <div className="h-56 rounded-2xl bg-base-100 border border-base-border" />
      </div>
      {/* KPI skeleton */}
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-base-100 border border-base-border" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-72 rounded-xl bg-base-100 border border-base-border" />
        <div className="h-72 rounded-xl bg-base-100 border border-base-border" />
      </div>
    </div>
  );
}

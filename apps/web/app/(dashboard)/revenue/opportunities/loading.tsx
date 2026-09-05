export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-base-200" />
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-base-100 border border-base-border" />
        ))}
      </div>
      <div className="h-24 rounded-xl bg-base-100 border border-base-border" />
      <div className="h-[50vh] rounded-xl bg-base-100 border border-base-border" />
    </div>
  );
}

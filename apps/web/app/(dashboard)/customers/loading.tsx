export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-base-200" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-base-100 border border-base-border" />
        ))}
      </div>
      <div className="h-[60vh] rounded-xl bg-base-100 border border-base-border" />
    </div>
  );
}

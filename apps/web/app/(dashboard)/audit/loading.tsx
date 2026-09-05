export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-base-200" />
      <div className="grid grid-cols-[1.4fr_0.6fr] gap-4">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-base-100 border border-base-border" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-base-100 border border-base-border" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading market">
      <div className="h-8 w-32 rounded bg-white/8" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-white/8" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.03] p-3 space-y-2">
            <div className="h-24 rounded-lg bg-white/8" />
            <div className="h-3 w-3/4 rounded bg-white/8" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
            <div className="h-6 w-16 rounded-full bg-white/8" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading market</span>
    </div>
  );
}

export default function ConstellationLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading constellation">
      <div className="h-8 w-36 rounded bg-white/8" />
      <div className="h-[320px] w-full rounded-2xl bg-white/[0.03]" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
            <div className="h-4 w-4 rounded-full bg-white/8 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-28 rounded bg-white/8" />
              <div className="h-2 w-40 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading constellation</span>
    </div>
  );
}

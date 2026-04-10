export default function MoltHubLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading molt hub">
      <div className="h-8 w-28 rounded bg-white/8" />
      <div className="h-4 w-48 rounded bg-white/5" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/8 shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-3.5 w-28 rounded bg-white/8" />
              <div className="h-2.5 w-20 rounded bg-white/5" />
            </div>
            <div className="h-7 w-16 rounded-lg bg-white/8 shrink-0" />
          </div>
          <div className="h-2.5 w-full rounded bg-white/5" />
          <div className="h-2.5 w-3/4 rounded bg-white/5" />
        </div>
      ))}
      <span className="sr-only">Loading molt hub</span>
    </div>
  );
}

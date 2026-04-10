export default function MoltBookLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading molt book">
      <div className="h-8 w-32 rounded bg-white/8" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-white/8" />
            <div className="h-5 w-12 rounded-full bg-white/5" />
          </div>
          <div className="h-2.5 w-full rounded bg-white/5" />
          <div className="h-2.5 w-4/5 rounded bg-white/5" />
          <div className="flex gap-2 pt-1">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-5 w-14 rounded-full bg-white/5" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading molt book</span>
    </div>
  );
}

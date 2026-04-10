export default function WorldEventsLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading world events">
      <div className="h-8 w-36 rounded bg-white/8" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-white/8" />
            <div className="h-4 w-28 rounded bg-white/8" />
            <div className="ml-auto h-5 w-14 rounded-full bg-white/8" />
          </div>
          <div className="h-2.5 w-full rounded bg-white/5" />
          <div className="h-2.5 w-2/3 rounded bg-white/5" />
          <div className="flex gap-2 pt-1">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="h-5 w-20 rounded-full bg-white/5" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading world events</span>
    </div>
  );
}

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading events">
      <div className="h-8 w-28 rounded bg-white/8" />
      <div className="h-40 rounded-2xl bg-white/[0.03] p-4 space-y-3">
        <div className="h-5 w-32 rounded bg-white/8" />
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-3/4 rounded bg-white/5" />
        <div className="h-6 w-24 rounded-full bg-white/8" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-white/8" />
            <div className="h-4 w-28 rounded bg-white/8" />
          </div>
          <div className="h-2.5 w-full rounded bg-white/5" />
          <div className="h-2.5 w-2/3 rounded bg-white/5" />
        </div>
      ))}
      <span className="sr-only">Loading events</span>
    </div>
  );
}

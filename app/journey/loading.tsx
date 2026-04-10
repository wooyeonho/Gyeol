export default function JourneyLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-5 animate-pulse" role="status" aria-label="Loading journey">
      <div className="h-8 w-28 rounded bg-white/8" />
      <div className="h-[280px] w-[280px] mx-auto rounded-full bg-white/[0.03]" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.03] p-3 text-center space-y-1">
            <div className="h-6 w-12 mx-auto rounded bg-white/8" />
            <div className="h-2.5 w-16 mx-auto rounded bg-white/5" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-3 w-16 rounded bg-white/5 shrink-0" />
            <div className="flex-1 h-12 rounded-lg bg-white/[0.03]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading journey</span>
    </div>
  );
}

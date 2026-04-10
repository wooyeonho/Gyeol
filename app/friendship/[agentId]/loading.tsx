export default function FriendshipLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-5 animate-pulse" role="status" aria-label="Loading friendship">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-white/8" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-28 rounded bg-white/8" />
          <div className="h-3 w-20 rounded bg-white/5" />
        </div>
      </div>
      <div className="rounded-xl bg-white/[0.03] p-4 space-y-3">
        <div className="h-4 w-24 rounded bg-white/8" />
        <div className="h-3 w-full rounded-full bg-white/5" />
        <div className="flex justify-between">
          <div className="h-2.5 w-16 rounded bg-white/5" />
          <div className="h-2.5 w-16 rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
            <div className="h-8 w-8 rounded-full bg-white/8 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-32 rounded bg-white/8" />
              <div className="h-2 w-20 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading friendship</span>
    </div>
  );
}

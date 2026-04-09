export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading community">
      <div className="h-8 w-40 rounded bg-white/8" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/8 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 rounded bg-white/8" />
              <div className="h-2 w-16 rounded bg-white/5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded bg-white/6" />
            <div className="h-2.5 w-4/5 rounded bg-white/5" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading community feed</span>
    </div>
  );
}

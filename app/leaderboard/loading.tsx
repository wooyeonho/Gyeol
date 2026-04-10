export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-3 animate-pulse" role="status" aria-label="Loading leaderboard">
      <div className="h-8 w-40 rounded bg-white/8" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
          <div className="h-5 w-5 rounded bg-white/8 shrink-0" />
          <div className="h-9 w-9 rounded-full bg-white/8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-white/8" />
            <div className="h-2 w-16 rounded bg-white/5" />
          </div>
          <div className="h-4 w-12 rounded bg-white/8 shrink-0" />
        </div>
      ))}
      <span className="sr-only">Loading leaderboard</span>
    </div>
  );
}

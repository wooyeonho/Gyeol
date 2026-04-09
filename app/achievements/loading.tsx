export default function AchievementsLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading achievements">
      <div className="h-8 w-36 rounded bg-white/8" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-white/[0.03] flex items-center justify-center">
            <div className="h-10 w-10 rounded-lg bg-white/8" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading achievements</span>
    </div>
  );
}

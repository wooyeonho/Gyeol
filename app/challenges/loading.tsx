export default function ChallengesLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading challenges">
      <div className="h-8 w-36 rounded bg-white/8" />
      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.03] p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-white/8 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-white/8" />
              <div className="h-2 w-full rounded bg-white/5" />
              <div className="h-2 w-1/2 rounded-full bg-white/8" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading challenges</span>
    </div>
  );
}

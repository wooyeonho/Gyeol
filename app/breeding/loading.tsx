export default function BreedingLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading breeding">
      <div className="h-8 w-28 rounded bg-white/8" />
      <div className="h-4 w-48 rounded bg-white/5" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/8" />
              <div className="h-3.5 w-24 rounded bg-white/8" />
            </div>
            <div className="h-5 w-16 rounded-full bg-white/8" />
          </div>
          <div className="h-2.5 w-full rounded bg-white/5" />
        </div>
      ))}
      <span className="sr-only">Loading breeding records</span>
    </div>
  );
}

export default function AdoptLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading adoption board">
      <div className="h-8 w-28 rounded bg-white/8" />
      <div className="h-4 w-52 rounded bg-white/5" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-4">
          <div className="h-12 w-12 rounded-full bg-white/8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-white/8" />
            <div className="h-2.5 w-32 rounded bg-white/5" />
          </div>
          <div className="h-8 w-16 rounded-lg bg-white/8 shrink-0" />
        </div>
      ))}
      <span className="sr-only">Loading adoption board</span>
    </div>
  );
}

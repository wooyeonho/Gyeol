export default function CrisisLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-5 animate-pulse" role="status" aria-label="Loading crisis status">
      <div className="h-8 w-32 rounded bg-white/8" />
      <div className="rounded-xl bg-white/[0.03] p-5 space-y-3">
        <div className="h-5 w-24 rounded bg-white/8" />
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-3/4 rounded bg-white/5" />
        <div className="h-10 w-full rounded-xl bg-white/8" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-2">
          <div className="h-3 w-20 rounded bg-white/5" />
          <div className="h-3 w-full rounded bg-white/5" />
          <div className="h-3 w-5/6 rounded bg-white/5" />
        </div>
      ))}
      <span className="sr-only">Loading crisis status</span>
    </div>
  );
}

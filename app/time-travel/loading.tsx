export default function TimeTravelLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading time travel">
      <div className="h-8 w-32 rounded bg-white/8" />
      <div className="h-3 w-48 rounded bg-white/5" />
      <div className="space-y-4 pt-2">
        <div className="h-3 w-24 rounded bg-white/5" />
        <div className="h-12 w-full rounded-xl bg-white/[0.03]" />
        <div className="h-12 w-full rounded-xl bg-white/8" />
      </div>
      <span className="sr-only">Loading time travel</span>
    </div>
  );
}

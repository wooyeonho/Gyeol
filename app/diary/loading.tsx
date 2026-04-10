export default function DiaryLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading diary">
      <div className="h-8 w-28 rounded bg-white/8" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-white/8" />
            <div className="h-2 w-16 rounded bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded bg-white/6" />
            <div className="h-2.5 w-5/6 rounded bg-white/5" />
            <div className="h-2.5 w-3/4 rounded bg-white/4" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading diary entries</span>
    </div>
  );
}

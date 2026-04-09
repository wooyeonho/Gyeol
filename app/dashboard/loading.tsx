export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading dashboard">
      <div className="h-8 w-36 rounded bg-white/8" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.03] p-4 space-y-2">
            <div className="h-2 w-16 rounded bg-white/6" />
            <div className="h-6 w-20 rounded bg-white/8" />
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white/[0.03] p-4 h-48" />
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}

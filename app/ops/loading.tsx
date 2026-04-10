export default function OpsLoading() {
  return (
    <div className="min-h-screen bg-black pt-16 pb-28 px-4 animate-pulse" role="status" aria-label="Loading ops dashboard">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-white/6" />
          <div className="h-7 w-40 rounded bg-white/8" />
          <div className="h-4 w-64 rounded bg-white/5" />
        </div>
        {/* Health score card */}
        <div className="rounded-2xl bg-zinc-900/60 p-4 space-y-3">
          <div className="h-3 w-32 rounded bg-white/6" />
          <div className="flex items-end justify-between">
            <div className="h-10 w-16 rounded bg-white/8" />
            <div className="h-6 w-16 rounded-full bg-white/[0.03]" />
          </div>
        </div>
        {/* Stale counts grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-zinc-900/60 p-3 space-y-2">
              <div className="h-2 w-24 rounded bg-white/6" />
              <div className="h-6 w-8 rounded bg-white/8" />
            </div>
          ))}
        </div>
        {/* Alert summary */}
        <div className="rounded-2xl bg-zinc-900/60 p-4 space-y-3">
          <div className="h-3 w-28 rounded bg-white/6" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-white/[0.03] px-3 py-2 space-y-1">
                <div className="h-2 w-12 rounded bg-white/6" />
                <div className="h-5 w-6 rounded bg-white/8" />
              </div>
            ))}
          </div>
        </div>
        {/* Env status card */}
        <div className="rounded-2xl bg-zinc-900/60 p-4 space-y-3">
          <div className="h-3 w-20 rounded bg-white/6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-36 rounded bg-white/5" />
              <div className="h-3 w-16 rounded bg-white/8" />
            </div>
          ))}
        </div>
        {/* Product activation card */}
        <div className="rounded-2xl bg-zinc-900/60 p-4 space-y-3">
          <div className="h-3 w-36 rounded bg-white/6" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/[0.03] p-3 space-y-2">
                <div className="h-2 w-20 rounded bg-white/6" />
                <div className="h-6 w-10 rounded bg-white/8" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading ops dashboard</span>
    </div>
  );
}

export default function PlansLoading() {
  return (
    <div className="min-h-screen bg-black px-4 py-10 animate-pulse sm:py-16" role="status" aria-label="Loading plans">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header card */}
        <div className="rounded-3xl bg-zinc-900/60 p-6 sm:p-8 space-y-4">
          <div className="h-3 w-20 rounded bg-white/6" />
          <div className="h-9 w-56 rounded bg-white/8" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="flex gap-3">
            <div className="h-10 w-24 rounded-full bg-white/8" />
            <div className="h-10 w-28 rounded-full bg-white/[0.03]" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-24 rounded-full bg-white/[0.03]" />
            <div className="h-7 w-28 rounded-full bg-white/[0.03]" />
          </div>
        </div>
        {/* Plan cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-zinc-900/60 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-12 rounded bg-white/6" />
                  <div className="h-8 w-24 rounded bg-white/8" />
                </div>
                {i === 1 && <div className="h-6 w-20 rounded-full bg-white/[0.03]" />}
              </div>
              <div className="h-4 w-full rounded bg-white/5" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-9 rounded-xl bg-white/[0.03]" />
                ))}
              </div>
              <div className="h-11 w-full rounded-xl bg-white/8" />
            </div>
          ))}
        </div>
        {/* Principles section */}
        <div className="rounded-3xl bg-zinc-900/60 p-6 space-y-4">
          <div className="h-6 w-40 rounded bg-white/8" />
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] p-4 space-y-2">
                <div className="h-4 w-2/3 rounded bg-white/8" />
                <div className="h-3 w-full rounded bg-white/5" />
                <div className="h-3 w-5/6 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading plans</span>
    </div>
  );
}

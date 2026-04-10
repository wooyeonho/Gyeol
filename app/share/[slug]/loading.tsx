export default function ShareLoading() {
  return (
    <div className="min-h-screen bg-black px-6 py-12 animate-pulse" role="status" aria-label="Loading share card">
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] bg-zinc-900/60 p-6 space-y-5">
          {/* Identity header */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-white/8" />
              <div className="h-3 w-24 rounded bg-white/6" />
            </div>
          </div>
          {/* Chips */}
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 w-16 rounded-full bg-white/[0.03]" />
            ))}
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3 space-y-2">
              <div className="mx-auto h-7 w-10 rounded bg-white/8" />
              <div className="mx-auto h-3 w-16 rounded bg-white/5" />
            </div>
            <div className="rounded-xl bg-white/5 p-3 space-y-2">
              <div className="mx-auto h-7 w-10 rounded bg-white/8" />
              <div className="mx-auto h-3 w-16 rounded bg-white/5" />
            </div>
          </div>
          {/* Milestones */}
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-white/6" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/8" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 rounded bg-white/8" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
          {/* CTA */}
          <div className="h-11 w-full rounded-xl bg-white/8" />
        </div>
        {/* Tagline */}
        <div className="mt-4 mx-auto h-3 w-40 rounded bg-white/5" />
      </div>
      <span className="sr-only">Loading share card</span>
    </div>
  );
}

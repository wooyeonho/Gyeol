export default function LandingLoading() {
  return (
    <div className="min-h-screen animate-pulse" role="status" aria-label="Loading landing page">
      {/* Hero section */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mx-auto h-3 w-32 rounded bg-white/8" />
          <div className="mx-auto h-12 w-3/4 rounded bg-white/8" />
          <div className="mx-auto h-5 w-2/3 rounded bg-white/5" />
          <div className="flex justify-center gap-4 pt-4">
            <div className="h-12 w-48 rounded-full bg-white/8" />
            <div className="h-12 w-36 rounded-full bg-white/[0.03]" />
          </div>
        </div>
      </div>
      {/* Features grid */}
      <div className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto h-8 w-48 rounded bg-white/8" />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-zinc-900/60 p-5 space-y-3">
                <div className="h-8 w-8 rounded bg-white/8" />
                <div className="h-4 w-2/3 rounded bg-white/8" />
                <div className="h-3 w-full rounded bg-white/5" />
                <div className="h-3 w-5/6 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Pricing */}
      <div className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto h-8 w-40 rounded bg-white/8" />
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-zinc-900/60 p-6 space-y-4">
                <div className="h-3 w-16 rounded bg-white/6" />
                <div className="h-8 w-24 rounded bg-white/8" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-3 w-full rounded bg-white/5" />
                  ))}
                </div>
                <div className="h-11 w-full rounded-xl bg-white/8" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading landing page</span>
    </div>
  );
}

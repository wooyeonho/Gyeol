export default function GenerateLoading() {
  return (
    <div className="min-h-screen px-4 pb-24 pt-20 animate-pulse" role="status" aria-label="Loading generate">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header card */}
        <div className="rounded-[2rem] bg-zinc-900/60 p-6 space-y-3">
          <div className="h-3 w-24 rounded bg-white/6" />
          <div className="h-8 w-48 rounded bg-white/8" />
          <div className="h-4 w-full rounded bg-white/5" />
        </div>
        {/* Mode selector */}
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-full bg-white/8" />
          <div className="h-10 w-28 rounded-full bg-white/[0.03]" />
        </div>
        {/* Prompt input card */}
        <div className="rounded-3xl bg-zinc-900/60 p-5 space-y-3">
          <div className="h-20 w-full rounded-xl bg-white/[0.03]" />
          <div className="h-11 w-full rounded-xl bg-white/8" />
        </div>
        {/* History section */}
        <div className="rounded-3xl bg-zinc-900/60 p-5 space-y-4">
          <div className="h-3 w-20 rounded bg-white/6" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] p-3 space-y-2">
                <div className="aspect-square rounded-xl bg-white/5" />
                <div className="h-3 w-3/4 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading generate</span>
    </div>
  );
}

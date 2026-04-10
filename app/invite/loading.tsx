export default function InviteHubLoading() {
  return (
    <div className="min-h-screen bg-black px-6 py-12 animate-pulse" role="status" aria-label="Loading invite hub">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] bg-zinc-900/60 p-6 sm:p-8 space-y-5">
          {/* Eyebrow */}
          <div className="h-3 w-20 rounded bg-white/6" />
          {/* Title */}
          <div className="h-9 w-56 rounded bg-white/8" />
          {/* Subtitle */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-4/5 rounded bg-white/5" />
          </div>
          {/* Info cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/[0.03] p-4 space-y-2">
              <div className="h-3 w-28 rounded bg-white/6" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-3/4 rounded bg-white/5" />
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4 space-y-2">
              <div className="h-3 w-28 rounded bg-white/6" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-3/4 rounded bg-white/5" />
            </div>
          </div>
          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3">
            <div className="h-11 w-36 rounded-full bg-white/8" />
            <div className="h-11 w-28 rounded-full bg-white/[0.03]" />
            <div className="h-11 w-28 rounded-full bg-white/[0.03]" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading invite hub</span>
    </div>
  );
}

export default function InviteCodeLoading() {
  return (
    <div className="min-h-screen bg-black px-6 py-12 animate-pulse" role="status" aria-label="Loading invite">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] bg-zinc-900/60 p-8 text-center space-y-5">
          {/* Eyebrow */}
          <div className="mx-auto h-3 w-28 rounded bg-white/6" />
          {/* Title */}
          <div className="mx-auto h-9 w-64 rounded bg-white/8" />
          {/* Subtitle */}
          <div className="mx-auto space-y-2">
            <div className="mx-auto h-4 w-full rounded bg-white/5" />
            <div className="mx-auto h-4 w-4/5 rounded bg-white/5" />
          </div>
          {/* Info cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/[0.03] p-4 space-y-2">
              <div className="h-3 w-24 rounded bg-white/6" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4 space-y-2">
              <div className="h-3 w-24 rounded bg-white/6" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
            </div>
          </div>
          {/* CTA buttons */}
          <div className="flex justify-center gap-3">
            <div className="h-11 w-36 rounded-full bg-white/8" />
            <div className="h-11 w-32 rounded-full bg-white/[0.03]" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading invite</span>
    </div>
  );
}

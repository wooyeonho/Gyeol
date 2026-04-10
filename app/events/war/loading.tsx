export default function WarLoading() {
  return (
    <div className="min-h-screen bg-black p-4 pb-20 animate-pulse" role="status" aria-label="Loading war event">
      {/* Title */}
      <div className="h-7 w-32 rounded bg-white/8" />
      {/* Score card */}
      <div className="mt-4 rounded-xl bg-zinc-900/60 p-4 space-y-3">
        <div className="h-3 w-28 rounded bg-white/6" />
        <div className="h-8 w-24 rounded bg-white/8" />
      </div>
      {/* Side indicators */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-zinc-900/60 p-4 space-y-2">
          <div className="h-3 w-16 rounded bg-white/6" />
          <div className="h-6 w-12 rounded bg-white/8" />
        </div>
        <div className="rounded-xl bg-zinc-900/60 p-4 space-y-2">
          <div className="h-3 w-16 rounded bg-white/6" />
          <div className="h-6 w-12 rounded bg-white/8" />
        </div>
      </div>
      {/* Description */}
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-4/5 rounded bg-white/5" />
      </div>
      {/* Back link */}
      <div className="mt-6 h-3 w-24 rounded bg-white/5" />
      <span className="sr-only">Loading war event</span>
    </div>
  );
}

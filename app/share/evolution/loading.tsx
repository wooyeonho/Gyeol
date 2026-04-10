export default function EvolutionShareLoading() {
  return (
    <div className="min-h-screen bg-black px-6 py-12 animate-pulse" role="status" aria-label="Loading evolution share">
      <div className="mx-auto max-w-sm space-y-6">
        {/* Evolution card */}
        <div className="rounded-3xl bg-zinc-900/60 p-6 space-y-5">
          {/* Eyebrow */}
          <div className="h-3 w-28 rounded bg-white/6" />
          {/* Gen level */}
          <div className="h-12 w-32 rounded bg-white/8" />
          {/* Name with indicator */}
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-white/8" />
            <div className="h-5 w-24 rounded bg-white/8" />
          </div>
          {/* Mutation badge */}
          <div className="h-6 w-20 rounded-full bg-white/[0.03]" />
          {/* Divider */}
          <div className="h-px w-full bg-white/[0.06]" />
          {/* Watermark */}
          <div className="flex items-center justify-between">
            <div className="h-2 w-12 rounded bg-white/5" />
            <div className="h-2 w-20 rounded bg-white/5" />
          </div>
        </div>
        {/* CTA */}
        <div className="h-11 w-full rounded-xl bg-white/8" />
        {/* Tagline */}
        <div className="mx-auto h-3 w-40 rounded bg-white/5" />
      </div>
      <span className="sr-only">Loading evolution share</span>
    </div>
  );
}

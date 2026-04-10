export default function DemoLoading() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 animate-pulse" role="status" aria-label="Loading demo">
      <div className="text-center max-w-md space-y-8">
        {/* Glowing orb placeholder */}
        <div className="mx-auto h-24 w-24 rounded-full bg-zinc-900/60" />
        {/* Title */}
        <div className="space-y-3">
          <div className="mx-auto h-7 w-64 rounded bg-white/8" />
          <div className="mx-auto h-4 w-full rounded bg-white/5" />
          <div className="mx-auto h-4 w-5/6 rounded bg-white/5" />
        </div>
        {/* CTA button */}
        <div className="mx-auto h-12 w-32 rounded-2xl bg-white/8" />
        {/* Subtitle */}
        <div className="mx-auto h-3 w-44 rounded bg-white/5" />
      </div>
      <span className="sr-only">Loading demo</span>
    </div>
  );
}

export default function TermsLoading() {
  return (
    <div className="min-h-screen bg-black px-4 py-10 animate-pulse sm:py-16" role="status" aria-label="Loading terms of service">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header card */}
        <div className="rounded-3xl bg-zinc-900/60 p-6 sm:p-8 space-y-4">
          <div className="h-3 w-12 rounded bg-white/6" />
          <div className="h-9 w-52 rounded bg-white/8" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-3 w-36 rounded bg-white/5" />
        </div>
        {/* Legal sections */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-3xl bg-zinc-900/60 p-5 space-y-3">
            <div className="h-5 w-44 rounded bg-white/8" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
              <div className="h-3 w-3/6 rounded bg-white/5" />
            </div>
          </div>
        ))}
        {/* Back link */}
        <div className="h-3 w-28 rounded bg-white/5" />
      </div>
      <span className="sr-only">Loading terms of service</span>
    </div>
  );
}

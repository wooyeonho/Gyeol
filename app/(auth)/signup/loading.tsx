export default function SignupLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" role="status" aria-label="Loading signup">
      <div className="w-full max-w-md animate-pulse space-y-6 rounded-3xl bg-zinc-900/60 p-6">
        {/* Eyebrow */}
        <div className="space-y-3">
          <div className="h-3 w-28 rounded bg-white/8" />
          <div className="h-7 w-52 rounded bg-white/8" />
          <div className="h-4 w-full rounded bg-white/5" />
        </div>
        {/* Benefit cards */}
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
        {/* Email input */}
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-white/6" />
          <div className="h-12 rounded-xl bg-white/[0.03]" />
        </div>
        {/* Password input */}
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-white/6" />
          <div className="h-12 rounded-xl bg-white/[0.03]" />
        </div>
        {/* Consent checkbox */}
        <div className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4">
          <div className="mt-1 h-5 w-5 shrink-0 rounded bg-white/8" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-3/4 rounded bg-white/5" />
          </div>
        </div>
        {/* Submit button */}
        <div className="h-12 rounded-xl bg-white/8" />
        {/* OAuth buttons */}
        <div className="flex gap-2">
          <div className="h-12 flex-1 rounded-xl bg-white/[0.03]" />
          <div className="h-12 flex-1 rounded-xl bg-white/[0.03]" />
        </div>
        {/* Footer links */}
        <div className="flex justify-between">
          <div className="h-3 w-24 rounded bg-white/5" />
          <div className="h-3 w-20 rounded bg-white/5" />
        </div>
      </div>
      <span className="sr-only">Loading signup</span>
    </div>
  );
}

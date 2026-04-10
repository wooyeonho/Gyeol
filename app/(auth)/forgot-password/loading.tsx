export default function ForgotPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" role="status" aria-label="Loading forgot password">
      <div className="w-full max-w-md animate-pulse space-y-6 rounded-3xl bg-zinc-900/60 p-6">
        {/* Eyebrow */}
        <div className="space-y-3">
          <div className="h-3 w-28 rounded bg-white/8" />
          <div className="h-7 w-56 rounded bg-white/8" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-4/5 rounded bg-white/5" />
        </div>
        {/* Email input */}
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-white/6" />
          <div className="h-12 rounded-xl bg-white/[0.03]" />
        </div>
        {/* Submit button */}
        <div className="h-12 rounded-xl bg-white/8" />
        {/* Back to login link */}
        <div className="h-3 w-24 rounded bg-white/5" />
      </div>
      <span className="sr-only">Loading forgot password</span>
    </div>
  );
}

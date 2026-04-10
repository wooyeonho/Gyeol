export default function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" role="status" aria-label="Loading reset password">
      <div className="w-full max-w-md animate-pulse space-y-6 rounded-3xl bg-zinc-900/60 p-6">
        {/* Eyebrow */}
        <div className="space-y-3">
          <div className="h-3 w-28 rounded bg-white/8" />
          <div className="h-7 w-52 rounded bg-white/8" />
        </div>
        {/* New password input */}
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-white/6" />
          <div className="h-12 rounded-xl bg-white/[0.03]" />
        </div>
        {/* Confirm password input */}
        <div className="space-y-2">
          <div className="h-3 w-32 rounded bg-white/6" />
          <div className="h-12 rounded-xl bg-white/[0.03]" />
        </div>
        {/* Submit button */}
        <div className="h-12 rounded-xl bg-white/8" />
      </div>
      <span className="sr-only">Loading reset password</span>
    </div>
  );
}

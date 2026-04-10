export default function OfflineLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 animate-pulse" role="status" aria-label="Loading offline page">
      <div className="text-center space-y-4">
        {/* Icon placeholder */}
        <div className="mx-auto h-14 w-14 rounded-2xl bg-zinc-900/60" />
        {/* Title */}
        <div className="mx-auto h-7 w-48 rounded bg-white/8" />
        {/* Description */}
        <div className="mx-auto max-w-sm space-y-2">
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-4/5 rounded bg-white/5" />
        </div>
        {/* Retry button */}
        <div className="mx-auto h-10 w-28 rounded-full bg-white/8" />
      </div>
      <span className="sr-only">Loading offline page</span>
    </div>
  );
}

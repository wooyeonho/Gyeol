export default function QuizLoading() {
  return (
    <div className="min-h-screen px-4 pb-28 pt-16 animate-pulse" role="status" aria-label="Loading quiz">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-3 w-28 rounded bg-white/6" />
          <div className="mx-auto h-7 w-32 rounded bg-white/8" />
          <div className="mx-auto h-4 w-64 rounded bg-white/5" />
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-white/10" />
          ))}
        </div>
        {/* Question */}
        <div className="py-4">
          <div className="mx-auto h-6 w-56 rounded bg-white/8" />
        </div>
        {/* Answer options */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-zinc-900/60 p-4">
              <div className="h-4 w-3/4 rounded bg-white/8" />
            </div>
          ))}
        </div>
        {/* Step counter */}
        <div className="mx-auto h-3 w-12 rounded bg-white/5" />
      </div>
      <span className="sr-only">Loading quiz</span>
    </div>
  );
}

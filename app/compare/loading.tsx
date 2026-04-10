export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading comparison">
      <div className="h-8 w-28 rounded bg-white/8" />
      <div className="flex gap-4 justify-center">
        <div className="flex-1 space-y-3 items-center text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-white/8" />
          <div className="h-4 w-20 mx-auto rounded bg-white/8" />
          <div className="h-3 w-16 mx-auto rounded bg-white/5" />
        </div>
        <div className="h-6 w-8 self-center rounded bg-white/8" />
        <div className="flex-1 space-y-3 items-center text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-white/8" />
          <div className="h-4 w-20 mx-auto rounded bg-white/8" />
          <div className="h-3 w-16 mx-auto rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-white/[0.03]" />
        ))}
      </div>
      <span className="sr-only">Loading comparison</span>
    </div>
  );
}

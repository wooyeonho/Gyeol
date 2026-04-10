export default function DnaEditLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-5 animate-pulse" role="status" aria-label="Loading DNA editor">
      <div className="h-8 w-32 rounded bg-white/8" />
      <div className="h-[200px] w-[200px] mx-auto rounded-3xl bg-white/[0.03]" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-20 rounded bg-white/5" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-3 w-16 rounded bg-white/8 shrink-0" />
                <div className="flex-1 h-2 rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading DNA editor</span>
    </div>
  );
}

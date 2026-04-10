export default function CreatureConversationLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading conversation">
      <div className="h-8 w-40 rounded bg-white/8" />
      <div className="h-4 w-56 rounded bg-white/5" />
      <div className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className={`rounded-2xl bg-white/[0.03] p-3 space-y-1 ${i % 2 === 0 ? "w-3/4" : "w-2/3"}`}>
              <div className="h-2.5 w-16 rounded bg-white/8" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-2/3 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading conversation</span>
    </div>
  );
}

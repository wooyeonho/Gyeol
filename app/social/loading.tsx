export default function SocialLoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-6 w-24 rounded skeleton-shimmer" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full skeleton-shimmer" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                <div className="h-2.5 w-16 rounded skeleton-shimmer" />
              </div>
            </div>
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="h-4 w-3/4 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

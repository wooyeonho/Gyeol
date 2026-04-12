export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-3 w-20 rounded skeleton-shimmer" />
          <div className="mx-auto h-7 w-40 rounded skeleton-shimmer" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

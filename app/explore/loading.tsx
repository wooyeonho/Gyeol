export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-6 w-28 rounded skeleton-shimmer" />
        <div className="h-48 rounded-2xl skeleton-shimmer" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CareLoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto h-4 w-20 rounded skeleton-shimmer" />
          <div className="mx-auto h-7 w-40 rounded skeleton-shimmer" />
        </div>
        <div className="mx-auto h-40 w-40 rounded-full skeleton-shimmer" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 w-14 rounded-full skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

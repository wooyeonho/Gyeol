export default function AlbumLoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-6 w-20 rounded skeleton-shimmer" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

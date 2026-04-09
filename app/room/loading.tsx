export default function RoomLoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-6 w-20 rounded skeleton-shimmer" />
        <div className="h-64 rounded-2xl skeleton-shimmer" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

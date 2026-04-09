export default function DNALoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto h-3 w-20 rounded skeleton-shimmer" />
          <div className="mx-auto h-7 w-32 rounded skeleton-shimmer" />
        </div>
        <div className="mx-auto h-[300px] w-[300px] rounded-full skeleton-shimmer" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

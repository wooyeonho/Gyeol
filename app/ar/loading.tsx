export default function ARLoading() {
  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-3 w-20 rounded skeleton-shimmer" />
          <div className="mx-auto h-7 w-40 rounded skeleton-shimmer" />
        </div>
        <div className="mx-auto h-[360px] w-full rounded-3xl skeleton-shimmer" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-2/3 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

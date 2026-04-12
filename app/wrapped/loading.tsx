export default function WrappedLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0f] px-6 pt-8">
      {/* Progress bar placeholders — match the real Wrapped chrome */}
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-white/10" />
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="skeleton-shimmer h-24 w-24 rounded-full" />
        <div className="skeleton-shimmer h-4 w-32 rounded" />
        <div className="skeleton-shimmer h-8 w-48 rounded" />
        <div className="skeleton-shimmer h-3 w-40 rounded" />
      </div>
    </div>
  );
}

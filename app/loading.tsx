export default function Loading() {
  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
      aria-label="로딩 중"
    >
      {/* Skeleton card placeholder */}
      <div className="w-full max-w-sm px-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/8 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-white/8" />
            <div className="h-2 w-1/2 rounded bg-white/6" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded bg-white/6" />
          <div className="h-2.5 w-5/6 rounded bg-white/5" />
          <div className="h-2.5 w-4/6 rounded bg-white/4" />
        </div>
      </div>

      {/* Breathing dots */}
      <div className="flex items-center gap-1.5">
        <span
          className="block h-1.5 w-1.5 rounded-full bg-white/40"
          style={{ animation: "pulse 1.8s ease-in-out infinite" }}
        />
        <span
          className="block h-1.5 w-1.5 rounded-full bg-white/40"
          style={{ animation: "pulse 1.8s ease-in-out 0.3s infinite" }}
        />
        <span
          className="block h-1.5 w-1.5 rounded-full bg-white/40"
          style={{ animation: "pulse 1.8s ease-in-out 0.6s infinite" }}
        />
      </div>

      <span className="sr-only">콘텐츠를 불러오는 중입니다.</span>
    </div>
  );
}

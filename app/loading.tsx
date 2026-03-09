export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]">
      <div className="gradient-void absolute inset-0" />
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-[var(--accent)] animate-pulse" />
          <div className="absolute inset-0 h-3 w-3 rounded-full bg-[var(--accent)] animate-ping opacity-30" />
        </div>
        <span className="text-sm font-medium text-[var(--muted)]">로딩 중</span>
      </div>
    </div>
  );
}

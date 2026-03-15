export default function Loading() {
  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="로딩 중"
    >
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span className="sr-only">콘텐츠를 불러오는 중입니다.</span>
    </div>
  );
}

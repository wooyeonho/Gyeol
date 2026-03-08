export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden />
    </div>
  );
}

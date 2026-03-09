export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-accent/40 animate-pulse" />
          <div className="absolute inset-[14px] rounded-full bg-accent/60" />
        </div>
      </div>
    </div>
  );
}

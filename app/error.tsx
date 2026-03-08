"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <p className="text-lg">문제가 발생했어요</p>
      <button onClick={reset} className="mt-4 px-6 py-2 rounded-lg bg-white/20">
        재시도
      </button>
    </div>
  );
}

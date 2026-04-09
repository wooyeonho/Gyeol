"use client";

import { useEffect } from "react";

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[segment] error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
      <p className="mb-2 text-lg font-semibold">문제가 발생했습니다</p>
      <p className="mb-6 text-sm text-white/50">{error.message || "알 수 없는 오류"}</p>
      <button
        onClick={reset}
        className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/20"
      >
        다시 시도
      </button>
    </div>
  );
}

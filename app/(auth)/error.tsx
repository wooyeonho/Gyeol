"use client";

import { useEffect } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[auth] error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
      <div className="bg-zinc-900/80 backdrop-blur rounded-2xl border border-white/10 p-8 text-center max-w-sm w-full">
        <h2 className="mb-2 text-lg font-semibold">인증 오류</h2>
        <p className="mb-6 text-sm text-white/50">
          문제가 발생했습니다. 다시 시도해주세요.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/20"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

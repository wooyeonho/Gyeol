"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <p className="text-white/80 text-center mb-4">Something went wrong.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
      >
        Try again
      </button>
    </div>
  );
}

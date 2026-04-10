"use client";

import { useEffect } from "react";

/**
 * Reusable error boundary for Next.js route segments.
 * Displays a minimal error message with retry option.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center"
      role="alert"
    >
      <div className="text-4xl">😵</div>
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-white/50 max-w-xs">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

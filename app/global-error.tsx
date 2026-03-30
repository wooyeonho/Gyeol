"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black text-white flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-semibold">Something went wrong</h2>
          <p className="text-white/60 text-sm max-w-md">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

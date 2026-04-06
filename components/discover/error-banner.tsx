"use client";

/**
 * Shared error banner for all discover section pages.
 * Ensures consistent styling across activity, social, leaderboard, etc.
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}

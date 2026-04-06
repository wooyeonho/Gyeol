"use client";

/**
 * Skeleton loading primitives for the discover section.
 * Replaces the single-dot spinner with structured skeleton cards
 * that match the final layout, so users see the page "shape" while
 * data loads — the same pattern Apple Music, Spotify, and Linear use.
 */

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded bg-white/[0.06] ${className}`} />
  );
}

/** Full-page skeleton for discover-style list pages. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header skeleton */}
        <div className="theme-panel rounded-2xl p-6">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="mt-4 h-7 w-56" />
          <Shimmer className="mt-3 h-4 w-full max-w-md" />
        </div>
        {/* Card skeletons */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Single agent card skeleton — matches AgentCard layout. */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Shimmer className="h-20 w-20 shrink-0 !rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Shimmer className="h-2.5 w-16" />
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-3 w-full max-w-[180px]" />
        </div>
      </div>
      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/[0.04] bg-black/20 p-2.5">
            <Shimmer className="h-2 w-8" />
            <Shimmer className="mt-1.5 h-4 w-10" />
          </div>
        ))}
      </div>
      {/* Chips */}
      <div className="mt-3 flex gap-1.5">
        <Shimmer className="h-5 w-14 !rounded-full" />
        <Shimmer className="h-5 w-18 !rounded-full" />
        <Shimmer className="h-5 w-12 !rounded-full" />
      </div>
    </div>
  );
}

/** Leaderboard row skeleton. */
export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4">
      <Shimmer className="h-10 w-10 shrink-0 !rounded-xl" />
      <Shimmer className="h-14 w-14 shrink-0 !rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-3.5 w-28" />
        <Shimmer className="h-2.5 w-40" />
      </div>
      <div className="space-y-1.5 text-right">
        <Shimmer className="ml-auto h-5 w-10" />
        <Shimmer className="ml-auto h-2.5 w-8" />
      </div>
    </div>
  );
}

/** Discover hub bento grid skeleton. */
export function DiscoverGridSkeleton() {
  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="theme-panel rounded-2xl p-6">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="mt-4 h-7 w-56" />
          <Shimmer className="mt-3 h-4 w-full max-w-lg" />
        </div>
        {/* Weekly event */}
        <Shimmer className="h-36 w-full !rounded-2xl" />
        {/* Challenge bar */}
        <Shimmer className="h-16 w-full !rounded-2xl" />
        {/* Divider */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <Shimmer className="h-3 w-16" />
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>
        {/* 2x3 grid */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-[130px] !rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

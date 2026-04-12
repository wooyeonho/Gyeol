/**
 * Universal skeleton loading components.
 * Use these across all pages for consistent loading states.
 */

interface SkeletonProps {
  className?: string;
}

function Base({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`}
    />
  );
}

/** Single line of text */
export function SkeletonText({ className = "" }: SkeletonProps) {
  return <Base className={`h-4 w-3/4 ${className}`} />;
}

/** Circle avatar */
export function SkeletonAvatar({ className = "" }: SkeletonProps) {
  return <Base className={`h-10 w-10 rounded-full ${className}`} />;
}

/** Card placeholder */
export function SkeletonCard({ className = "" }: SkeletonProps) {
  return <Base className={`h-28 w-full rounded-2xl ${className}`} />;
}

/** Feed card with avatar + text */
export function SkeletonFeedCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`flex gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 ${className}`}>
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Base className="h-3 w-1/3" />
        <Base className="h-3 w-full" />
        <Base className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Full page skeleton (N rows) */
export function SkeletonPage({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

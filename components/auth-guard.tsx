"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AuthGuardProps = {
  children: React.ReactNode;
  /** Redirect path when unauthenticated. Default: /login */
  redirectTo?: string;
};

/**
 * Unified auth guard: redirects to login when user is not authenticated.
 * Use in layouts for pages that require auth (settings, activity, social, etc.).
 */
export function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => {
        if (!cancelled && r.status === 401) {
          const next = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
          const target = redirectTo.includes("?")
            ? `${redirectTo}&next=${encodeURIComponent(next)}`
            : `${redirectTo}?next=${encodeURIComponent(next)}`;
          router.replace(target);
          return;
        }
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          const next = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
          const target = redirectTo.includes("?")
            ? `${redirectTo}&next=${encodeURIComponent(next)}`
            : `${redirectTo}?next=${encodeURIComponent(next)}`;
          router.replace(target);
        }
      });
    return () => { cancelled = true; };
  }, [pathname, redirectTo, router, searchParams]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-live="polite" aria-label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}

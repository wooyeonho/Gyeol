"use client";

import { useCallback, useState } from "react";

/**
 * useSharedTransition — wraps the View Transitions API for smooth
 * cross-page or cross-state animated transitions.
 *
 * Falls back to immediate execution when the API is unavailable
 * (non-Chromium browsers, SSR, prefers-reduced-motion).
 *
 * Inspired by: Linear's page transitions, Arc Browser's liquidity.
 *
 * Usage:
 *   const { startTransition } = useSharedTransition();
 *   startTransition(() => setPage("detail"));
 */

interface ViewTransitionDocument {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
}

export function useSharedTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = useCallback(
    (callback: () => void | Promise<void>) => {
      // SSR guard
      if (typeof document === "undefined") {
        callback();
        return;
      }

      // Respect reduced motion
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      const doc = document as unknown as ViewTransitionDocument;

      if (!doc.startViewTransition || prefersReduced) {
        callback();
        return;
      }

      setIsTransitioning(true);
      const transition = doc.startViewTransition(callback);
      transition.finished.finally(() => {
        setIsTransitioning(false);
      });
    },
    [],
  );

  return { startTransition, isTransitioning };
}

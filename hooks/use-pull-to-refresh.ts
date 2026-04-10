"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface PullToRefreshOptions {
  /** Callback when pull threshold is met */
  onRefresh: () => Promise<void>;
  /** Pull distance in pixels to trigger (default: 80) */
  threshold?: number;
  /** Element ref to attach to (default: document) */
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Mobile pull-to-refresh gesture hook.
 * Shows a visual indicator and triggers refresh on release.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  containerRef,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef?.current ?? document.documentElement;
    if (el.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    }
  }, [containerRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullingRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) {
      // Diminishing returns on pull distance for rubbery feel
      setPullDistance(Math.min(dy * 0.4, threshold * 1.5));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef?.current ?? document;
    el.addEventListener("touchstart", handleTouchStart as EventListener, { passive: true });
    el.addEventListener("touchmove", handleTouchMove as EventListener, { passive: true });
    el.addEventListener("touchend", handleTouchEnd as EventListener);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart as EventListener);
      el.removeEventListener("touchmove", handleTouchMove as EventListener);
      el.removeEventListener("touchend", handleTouchEnd as EventListener);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullDistance,
    isRefreshing,
    /** Whether pull has reached threshold */
    isReady: pullDistance >= threshold,
  };
}

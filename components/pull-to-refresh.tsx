"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const PULL_THRESHOLD = 60;
const MAX_PULL = 120;

/**
 * Pull-to-refresh wrapper for mobile views.
 * Detects a downward swipe when the page is scrolled to the very top
 * and triggers an async refresh callback.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  // Spring-driven pull distance for smooth release animation
  const pullDistance = useSpring(0, { stiffness: 300, damping: 30 });
  const indicatorOpacity = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 180]);
  const indicatorScale = useTransform(pullDistance, [0, PULL_THRESHOLD, MAX_PULL], [0.5, 1, 1.1]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (refreshing) return;
      // Only activate when scrolled to the very top
      if (window.scrollY !== 0) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [refreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY < 0) {
        // Scrolling up — cancel pull gesture
        pulling.current = false;
        pullDistance.set(0);
        return;
      }
      // Apply diminishing resistance as user pulls further
      const dampened = Math.min(deltaY * 0.5, MAX_PULL);
      pullDistance.set(dampened);
    },
    [refreshing, pullDistance],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    const current = pullDistance.get();

    if (current >= PULL_THRESHOLD) {
      setRefreshing(true);
      // Hold at threshold while refreshing
      pullDistance.set(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      // Spring back to zero
      pullDistance.set(0);
    }
  }, [onRefresh, pullDistance]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div className="relative">
      {/* Pull indicator */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 z-50 flex items-center justify-center"
        style={{ height: pullDistance, opacity: indicatorOpacity }}
      >
        <motion.div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
          style={{ scale: indicatorScale }}
        >
          {refreshing ? (
            <svg
              className="h-4 w-4 animate-spin text-white/80"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <motion.svg
              className="h-4 w-4 text-white/80"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ rotate: indicatorRotation }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          )}
        </motion.div>
      </motion.div>

      {/* Content pushed down by pull distance */}
      <motion.div style={{ y: pullDistance }}>
        {children}
      </motion.div>
    </div>
  );
}

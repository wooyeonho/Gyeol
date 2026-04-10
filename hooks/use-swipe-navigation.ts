"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface SwipeNavigationOptions {
  /** Tab paths in order */
  tabs: string[];
  /** Current active tab path */
  currentTab: string;
  /** Navigate to a tab */
  onNavigate: (path: string) => void;
  /** Minimum swipe distance in pixels (default: 50) */
  threshold?: number;
  /** Maximum vertical distance to count as horizontal swipe (default: 80) */
  maxVertical?: number;
}

/**
 * KakaoTalk/iOS-style swipe navigation between tabs.
 * Detects left/right swipes and navigates to adjacent tabs.
 */
export function useSwipeNavigation({
  tabs,
  currentTab,
  onNavigate,
  threshold = 50,
  maxVertical = 80,
}: SwipeNavigationOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const currentIndex = tabs.indexOf(currentTab);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startRef.current) return;
    const dx = e.touches[0].clientX - startRef.current.x;
    const dy = Math.abs(e.touches[0].clientY - startRef.current.y);

    // Only track horizontal swipes
    if (dy > maxVertical) {
      startRef.current = null;
      setSwipeOffset(0);
      return;
    }

    // Resistance at edges
    const atLeftEdge = currentIndex === 0 && dx > 0;
    const atRightEdge = currentIndex === tabs.length - 1 && dx < 0;
    const resistance = atLeftEdge || atRightEdge ? 0.2 : 0.5;
    setSwipeOffset(dx * resistance);
  }, [currentIndex, tabs.length, maxVertical]);

  const handleTouchEnd = useCallback(() => {
    if (!startRef.current) return;

    if (Math.abs(swipeOffset) >= threshold * 0.5) {
      if (swipeOffset > 0 && currentIndex > 0) {
        onNavigate(tabs[currentIndex - 1]);
      } else if (swipeOffset < 0 && currentIndex < tabs.length - 1) {
        onNavigate(tabs[currentIndex + 1]);
      }
    }

    startRef.current = null;
    setSwipeOffset(0);
  }, [swipeOffset, threshold, currentIndex, tabs, onNavigate]);

  useEffect(() => {
    const el = document;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    /** Current swipe offset in pixels (for animation) */
    swipeOffset,
    /** Current tab index */
    currentIndex,
    /** Whether actively swiping */
    isSwiping: startRef.current !== null,
  };
}

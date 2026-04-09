"use client";

import { useCallback, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { haptic } from "@/lib/micro-interactions";

/**
 * Swipe navigation — detects left/right swipe gestures to navigate between tabs.
 * Inspired by KakaoTalk/iOS tab swiping.
 */

const TAB_ORDER = ["/", "/discover", "/settings"];
const MIN_SWIPE_DISTANCE = 80; // px
const MAX_SWIPE_TIME = 300; // ms

export function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const currentTabIndex = TAB_ORDER.indexOf(pathname);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (currentTabIndex === -1) return; // Not on a main tab

      let nextIndex: number;
      if (direction === "left") {
        nextIndex = currentTabIndex + 1;
      } else {
        nextIndex = currentTabIndex - 1;
      }

      if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

      haptic("swipe");
      router.push(TAB_ORDER[nextIndex]);
    },
    [currentTabIndex, router],
  );

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current || e.changedTouches.length !== 1) return;

      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.time;

      touchStart.current = null;

      // Must be primarily horizontal (not vertical scroll)
      if (Math.abs(dy) > Math.abs(dx) * 0.7) return;

      // Must be fast enough and far enough
      if (dt > MAX_SWIPE_TIME || Math.abs(dx) < MIN_SWIPE_DISTANCE) return;

      // Don't swipe if inside an input/textarea or scrollable container
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[data-no-swipe]")
      ) {
        return;
      }

      handleSwipe(dx < 0 ? "left" : "right");
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleSwipe]);

  return <>{children}</>;
}

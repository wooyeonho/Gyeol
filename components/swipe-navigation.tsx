"use client";

import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/micro-interactions";

/* ── Tab configuration ── */

const TAB_ORDER = ["/", "/discover", "/settings"];
const MIN_SWIPE_DISTANCE = 50; // px – minimum horizontal travel to trigger navigation
const MAX_VERTICAL_MOVEMENT = 30; // px – above this we treat it as a scroll, not a swipe

/* ── Slide animation variants ── */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "40%" : "-40%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-20%" : "20%",
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 400, damping: 35, mass: 0.8 },
  opacity: { duration: 0.18 },
};

/* ── Edge indicator gradient ── */

function EdgeIndicator({
  side,
  intensity,
}: {
  side: "left" | "right";
  intensity: number;
}) {
  if (intensity <= 0) return null;

  const clamped = Math.min(intensity, 1);

  return (
    <div
      className="pointer-events-none fixed top-0 bottom-0 z-30"
      style={{
        [side]: 0,
        width: 40,
        opacity: clamped * 0.6,
        background:
          side === "left"
            ? "linear-gradient(to right, rgba(255,255,255,0.08), transparent)"
            : "linear-gradient(to left, rgba(255,255,255,0.08), transparent)",
        transition: "opacity 60ms ease-out",
      }}
    />
  );
}

/* ── Main component ── */

/**
 * SwipeNavigation — wraps page content and enables horizontal swipe between
 * the main tabs (chat / discover / settings), inspired by KakaoTalk.
 *
 * Uses passive touch event listeners for performance, and doesn't
 * interfere with vertical scrolling (MAX_VERTICAL_MOVEMENT threshold).
 *
 * Can be used as a simple wrapper (no props besides children) or with
 * explicit props for external control.
 */
export function SwipeNavigation({
  currentTab,
  tabs,
  onTabChange,
  children,
}: {
  currentTab?: string;
  tabs?: string[];
  onTabChange?: (tab: string) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Allow either prop-driven or pathname-driven usage
  const activeTabs = tabs ?? TAB_ORDER;
  const activeTab = currentTab ?? pathname;
  const currentTabIndex = activeTabs.indexOf(activeTab);

  // Track slide direction for AnimatePresence: +1 = forward, -1 = backward
  const [slideDirection, setSlideDirection] = useState(0);

  // Edge indicator state
  const [edgeIndicator, setEdgeIndicator] = useState<{
    side: "left" | "right";
    intensity: number;
  } | null>(null);

  // Touch tracking refs (refs to avoid re-renders on every move)
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const touchDelta = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const isSwipeCancelled = useRef(false);

  const navigateToTab = useCallback(
    (direction: "left" | "right") => {
      if (currentTabIndex === -1) return;

      const nextIndex =
        direction === "left" ? currentTabIndex + 1 : currentTabIndex - 1;

      if (nextIndex < 0 || nextIndex >= activeTabs.length) return;

      // Set slide direction for AnimatePresence
      setSlideDirection(direction === "left" ? 1 : -1);

      haptic("swipe");

      if (onTabChange) {
        onTabChange(activeTabs[nextIndex]);
      } else {
        router.push(activeTabs[nextIndex]);
      }
    },
    [currentTabIndex, activeTabs, onTabChange, router],
  );

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      touchDelta.current = { dx: 0, dy: 0 };
      isSwipeCancelled.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current || isSwipeCancelled.current) return;
      if (e.touches.length !== 1) return;

      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      touchDelta.current = { dx, dy };

      // If vertical movement exceeds threshold, cancel the swipe
      if (Math.abs(dy) > MAX_VERTICAL_MOVEMENT) {
        isSwipeCancelled.current = true;
        setEdgeIndicator(null);
        return;
      }

      // Show edge indicator while swiping horizontally
      const absDx = Math.abs(dx);
      if (absDx > 10) {
        // Swiping right (dx > 0) → navigates to previous → show LEFT edge
        // Swiping left (dx < 0) → navigates to next → show RIGHT edge
        const side = dx > 0 ? "left" : "right";
        const canNavigate =
          dx > 0
            ? currentTabIndex > 0
            : currentTabIndex < activeTabs.length - 1 &&
              currentTabIndex !== -1;

        if (canNavigate) {
          const intensity = Math.min((absDx - 10) / 60, 1);
          setEdgeIndicator({ side, intensity });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Clear edge indicator
      setEdgeIndicator(null);

      if (
        !touchStart.current ||
        isSwipeCancelled.current ||
        e.changedTouches.length !== 1
      ) {
        touchStart.current = null;
        return;
      }

      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;

      touchStart.current = null;

      // Must be primarily horizontal: vertical must stay under threshold
      if (Math.abs(dy) > MAX_VERTICAL_MOVEMENT) return;

      // Must travel far enough
      if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return;

      // Don't swipe inside inputs, textareas, contentEditable, or [data-no-swipe]
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[data-no-swipe]")
      ) {
        return;
      }

      navigateToTab(dx < 0 ? "left" : "right");
    };

    // Passive listeners for performance — won't block scrolling
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigateToTab, currentTabIndex, activeTabs.length]);

  // Not on a main tab — just render children without animation
  if (currentTabIndex === -1) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Edge swipe indicators */}
      {edgeIndicator && (
        <EdgeIndicator
          side={edgeIndicator.side}
          intensity={edgeIndicator.intensity}
        />
      )}

      {/* Animated page transition */}
      <AnimatePresence mode="wait" custom={slideDirection}>
        <motion.div
          key={activeTab}
          custom={slideDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

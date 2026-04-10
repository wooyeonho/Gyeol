"use client";

import { useState, useCallback, useRef } from "react";

/**
 * WCAG 2.2 live announcer for dynamic content changes.
 * Screen readers announce changes to coin balance, achievements, etc.
 *
 * Usage:
 *   const { announce } = useLiveAnnouncer();
 *   announce("You earned 50 coins!");
 */
export function useLiveAnnouncer() {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((text: string) => {
    // Clear and re-set to ensure screen reader re-announces
    setMessage("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setMessage(text), 50);
  }, []);

  return { message, announce };
}

/**
 * Hidden live region element — place once in layout.
 * Announces messages set via useLiveAnnouncer().
 */
export function LiveAnnouncerRegion({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

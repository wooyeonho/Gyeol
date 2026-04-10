"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnimatedNumberProps {
  /** The target numeric value to animate to. */
  value: number;
  /** Animation duration in milliseconds. */
  duration?: number;
  /** String placed before the number (e.g. "🪙"). */
  prefix?: string;
  /** String placed after the number (e.g. "XP"). */
  suffix?: string;
  /** Custom formatter — receives the current number, returns a display string.
   *  Default: locale-aware comma formatting via `toLocaleString`. */
  format?: (n: number) => string;
  /** Additional CSS class names. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Default formatter
// ---------------------------------------------------------------------------

function defaultFormat(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

/** Ease-out cubic: decelerates towards the end. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Count-up / count-down animation between numeric values.
 *
 * Uses `requestAnimationFrame` for smooth 60 fps updates and an ease-out
 * cubic curve so the number "lands" softly on the target.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  format = defaultFormat,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState<string>(() => format(value));
  const prevValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    // No animation needed when the value hasn't changed.
    if (from === to) return;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = from + (to - from) * eased;

      setDisplay(format(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration, format]);

  return (
    <span className={className} aria-live="polite">
      {prefix}{display}{suffix}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Target value to animate to */
  value: number;
  /** Duration in ms */
  duration?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Prefix (e.g., "$" or "🪙") */
  prefix?: string;
  /** Suffix (e.g., "%" or " coins") */
  suffix?: string;
  /** CSS class for the number */
  className?: string;
}

/**
 * Toss-style count-up animation for numbers.
 * Smoothly animates from previous value to new value.
 */
export function CountUp({
  value,
  duration = 600,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className={className} aria-live="polite">
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

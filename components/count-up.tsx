"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Target value to animate to */
  value: number;
  /** Animation duration in ms (default 600) */
  duration?: number;
  /** Prefix string (e.g. "₩") */
  prefix?: string;
  /** Suffix string (e.g. "원" or "%") */
  suffix?: string;
  /** CSS class for the wrapper span */
  className?: string;
}

/**
 * Toss-style count-up animation for numbers.
 * Smoothly animates from previous value to new value using requestAnimationFrame
 * with ease-out cubic easing for natural deceleration.
 * Numbers are formatted with commas via toLocaleString.
 */
export function CountUp({
  value,
  duration = 600,
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(to);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic: 1 - (1 - t)^3
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

  const formatted = Number.isInteger(display)
    ? Math.round(display).toLocaleString()
    : display.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

  return (
    <span className={className} aria-live="polite" aria-atomic="true">
      <span aria-hidden="true">
        {prefix}
        {formatted}
        {suffix}
      </span>
      {/* Screen readers get the final, stable value */}
      <span className="sr-only">
        {prefix}
        {value.toLocaleString()}
        {suffix}
      </span>
    </span>
  );
}

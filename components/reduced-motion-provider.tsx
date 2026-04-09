"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Global ReducedMotion wrapper.
 * Respects prefers-reduced-motion OS setting via Framer Motion's built-in support.
 * When enabled, all framer-motion animations are simplified/removed.
 *
 * WCAG 2.2 §2.3.3 — Animation from Interactions
 */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}

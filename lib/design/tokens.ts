/**
 * Gyeol Design Tokens — world-class motion, elevation, typography system.
 *
 * Synthesized from:
 *  - Apple HIG & iOS Spring Animation values
 *  - Linear's motion choreography
 *  - Airbnb DLS (Design Language System)
 *  - Stripe's elevation scale
 *  - Material 3's easing curves
 *  - Arc Browser's liquidity principles
 *
 * Use these tokens for any new motion/elevation work. The existing CSS vars in
 * globals.css remain the source of truth for color; this file defines the
 * behavior layer on top of it.
 */

/* ── Easing curves ─────────────────────────────────────────────────────── */

export const easing = {
  /** Snappy, playful — buttons, toggles */
  standard: [0.4, 0, 0.2, 1] as const,
  /** Apple-style — modal present, sheet slide */
  emphasized: [0.2, 0, 0, 1] as const,
  /** Linear-style — list reorder, smooth */
  smooth: [0.16, 1, 0.3, 1] as const,
  /** Overshoot bounce — celebration, jackpot */
  bounceOut: [0.34, 1.56, 0.64, 1] as const,
  /** Gentle deceleration — fade in */
  decelerate: [0, 0, 0.2, 1] as const,
  /** Gentle acceleration — fade out, dismiss */
  accelerate: [0.4, 0, 1, 1] as const,
  /** Anticipation — swing before leaving */
  anticipate: [0.68, -0.55, 0.27, 1.55] as const,
} as const;

/* ── Durations (milliseconds) ──────────────────────────────────────────── */

export const duration = {
  instant: 80,
  micro: 120,
  fast: 180,
  normal: 260,
  slow: 420,
  slower: 620,
  presence: 820,
  cinematic: 1200,
} as const;

/* ── Spring physics (for framer-motion / rAF) ──────────────────────────── */

export const spring = {
  /** Apple iOS default — used for sheets, cards, presence */
  apple: { type: "spring" as const, stiffness: 380, damping: 30, mass: 1 },
  /** Gentle float — used for ambient breathing motion on creature */
  float: { type: "spring" as const, stiffness: 120, damping: 14, mass: 1.2 },
  /** Snappy pop — used for taps, selection, haptic confirmation */
  pop: { type: "spring" as const, stiffness: 520, damping: 22, mass: 0.9 },
  /** Wobble — celebration, evolution */
  wobble: { type: "spring" as const, stiffness: 220, damping: 8, mass: 1 },
  /** Silky slide — page transitions, drawer */
  silk: { type: "spring" as const, stiffness: 200, damping: 26, mass: 1 },
} as const;

/* ── Elevation (drop-shadow + glow) ────────────────────────────────────── */

export const elevation = {
  flat: "none",
  e1: "0 1px 2px rgba(0,0,0,0.35)",
  e2: "0 2px 6px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.18)",
  e3: "0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.22)",
  e4: "0 16px 40px rgba(0,0,0,0.45), 0 6px 12px rgba(0,0,0,0.28)",
  e5: "0 32px 80px rgba(0,0,0,0.55), 0 12px 24px rgba(0,0,0,0.35)",
  /** Soft inner glow for focused input */
  focusRing: "0 0 0 2px rgba(129,140,248,0.55), 0 0 0 4px rgba(129,140,248,0.15)",
  /** Living aura — for the creature presence */
  aura: "0 0 40px rgba(129,140,248,0.35), 0 0 120px rgba(129,140,248,0.18)",
} as const;

/* ── Radius scale ──────────────────────────────────────────────────────── */

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  "2xl": 28,
  "3xl": 36,
  pill: 9999,
} as const;

/* ── Z-index strata ────────────────────────────────────────────────────── */

export const layer = {
  base: 0,
  sticky: 10,
  overlay: 40,
  navigation: 50,
  popover: 60,
  dropdown: 70,
  modal: 80,
  toast: 90,
  commandPalette: 100,
  critical: 999,
} as const;

/* ── Motion variants (for framer-motion) ───────────────────────────────── */

export const motion = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: duration.normal / 1000, ease: easing.decelerate },
  },
  slideUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: duration.normal / 1000, ease: easing.smooth },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: spring.pop,
  },
  sheet: {
    initial: { opacity: 0, y: "100%" },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: "100%" },
    transition: spring.silk,
  },
  listItem: (index: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: duration.normal / 1000,
      ease: easing.smooth,
      delay: Math.min(index * 0.04, 0.32),
    },
  }),
} as const;

/* ── Semantic breakpoints ──────────────────────────────────────────────── */

export const breakpoint = {
  phone: 480,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
} as const;

/* ── Reduced-motion safe wrapper ───────────────────────────────────────── */

/**
 * Returns the motion config or a zero-duration fallback if the user has
 * prefers-reduced-motion enabled. Call this at render time.
 */
export function respectMotion<T extends { transition?: unknown }>(config: T): T {
  if (typeof window === "undefined") return config;
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!prefersReduced) return config;
  return { ...config, transition: { duration: 0 } };
}

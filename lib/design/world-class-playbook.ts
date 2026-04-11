/**
 * World-class design playbook — synthesized from 10+ top-tier apps.
 *
 * Source apps analyzed (see WORLD_CLASS_APPS_RESEARCH.md):
 *   Apple HIG, Linear, Figma, Notion, Arc Browser, Airbnb DLS, Stripe,
 *   Robinhood, Headspace/Calm, Duolingo, Pinterest, Instagram.
 *
 * This module is the **behavior** layer that sits on top of
 * `lib/design/tokens.ts`. Tokens define the raw values; the playbook codifies
 * *how to use them* as reusable, named patterns that any component can import.
 *
 * Design rule of thumb:
 *   — Motion follows Apple spring physics.
 *   — Density follows Linear (compact, keyboard-first).
 *   — Imagery follows Airbnb/Pinterest (large, warm, rounded).
 *   — Numbers follow Stripe/Robinhood (scrub, celebrate, semantic color).
 *   — Breath follows Calm (gentle, non-demanding loops).
 *   — Play follows Duolingo (streaks, characters, feedback).
 */

import { duration, easing, elevation, radius, spring } from "./tokens";

/* ── Named design principles (copy + guidance) ─────────────────────────── */

export type DesignPrinciple = {
  id: string;
  source: string;
  rule: string;
  appliesTo: readonly string[];
};

export const DESIGN_PRINCIPLES: readonly DesignPrinciple[] = [
  {
    id: "physical-motion",
    source: "Apple HIG",
    rule: "All motion must feel like real mass — use spring.apple for sheets, spring.pop for taps.",
    appliesTo: ["sheet", "modal", "button", "toast"],
  },
  {
    id: "keyboard-first",
    source: "Linear",
    rule: "Every primary action must have a keyboard shortcut and appear in the command palette.",
    appliesTo: ["command-palette", "shortcut-help", "navigation"],
  },
  {
    id: "dense-information",
    source: "Linear / Superhuman",
    rule: "Prefer compact rows over padding — reserve whitespace for hero moments only.",
    appliesTo: ["list", "inbox", "timeline"],
  },
  {
    id: "image-first-warmth",
    source: "Airbnb DLS",
    rule: "Hero imagery uses radius.2xl (28px), warm off-white background, and at least 2:3 ratio.",
    appliesTo: ["card", "hero", "portrait-gallery"],
  },
  {
    id: "precise-elevation",
    source: "Stripe",
    rule: "Never use drop-shadow alone — always pair a tight inner shadow with a diffuse outer one.",
    appliesTo: ["card", "popover", "tooltip"],
  },
  {
    id: "number-theatre",
    source: "Robinhood",
    rule: "Numbers should scrub, not pop — animate via rAF at 60fps, color-code by direction.",
    appliesTo: ["count-up", "stat-card", "streak-display"],
  },
  {
    id: "breath-loop",
    source: "Headspace / Calm",
    rule: "Idle surfaces breathe at 4-second inhale / 6-second exhale sine; never jitter.",
    appliesTo: ["creature-idle", "aura", "focus-empty"],
  },
  {
    id: "character-feedback",
    source: "Duolingo",
    rule: "Every success and failure must have a character reaction within 120ms.",
    appliesTo: ["creature-reaction", "celebration", "error"],
  },
  {
    id: "masonic-grid",
    source: "Pinterest",
    rule: "Grid thumbnails load with blurhash placeholder, stagger in with 40ms offset.",
    appliesTo: ["album", "gallery", "feed"],
  },
  {
    id: "story-swipe",
    source: "Instagram",
    rule: "Horizontal story swipes must resist at 40%, then rubber-band; no hard stops.",
    appliesTo: ["story", "chapter", "onboarding"],
  },
  {
    id: "liquid-space",
    source: "Arc Browser",
    rule: "Space transitions tint the whole shell — no hard scene cuts, always cross-fade color.",
    appliesTo: ["space-switcher", "theme-switcher", "dna-edit"],
  },
  {
    id: "notion-slash",
    source: "Notion",
    rule: "Typing `/` in any text field must open the inline slash command menu.",
    appliesTo: ["chat-input", "memory-editor", "diary"],
  },
] as const;

/* ── Reusable motion presets — ready for framer-motion ─────────────────── */

export const worldClassMotion = {
  /** Apple-style sheet presentation */
  sheetPresent: {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 24, scale: 0.98 },
    transition: spring.apple,
  },
  /** Linear-style list item reorder (smooth easing) */
  listReorder: {
    layout: true,
    transition: { duration: duration.normal / 1000, ease: easing.smooth },
  },
  /** Duolingo success pop — character reacts */
  successPop: {
    initial: { scale: 0.6, rotate: -6, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    transition: spring.wobble,
  },
  /** Calm breath idle loop — use in animate with repeat: Infinity */
  breathLoop: {
    scale: [1, 1.035, 1],
    transition: {
      duration: 10,
      repeat: Infinity,
      ease: easing.smooth,
      times: [0, 0.4, 1],
    },
  },
  /** Instagram story swipe rubber-band */
  storyResist: {
    drag: "x" as const,
    dragElastic: 0.4,
    dragMomentum: false,
    dragTransition: { bounceStiffness: 220, bounceDamping: 26 },
  },
  /** Stripe precise card hover */
  cardHover: {
    whileHover: { y: -2, boxShadow: elevation.e3 },
    transition: { duration: duration.fast / 1000, ease: easing.standard },
  },
  /** Arc liquid theme transition — use for whole-page tint changes */
  liquidTheme: {
    transition: { duration: duration.slower / 1000, ease: easing.smooth },
  },
} as const;

/* ── Semantic card shapes ──────────────────────────────────────────────── */

export const cardShape = {
  /** Airbnb hero card — large radius, soft elevation */
  hero: {
    borderRadius: radius["2xl"],
    boxShadow: elevation.e3,
  },
  /** Notion inline block */
  block: {
    borderRadius: radius.md,
    boxShadow: elevation.e1,
  },
  /** Linear dense row (no elevation) */
  row: {
    borderRadius: radius.sm,
    boxShadow: elevation.flat,
  },
  /** Calm focus surface — wide radius, aura */
  focus: {
    borderRadius: radius["3xl"],
    boxShadow: elevation.aura,
  },
} as const;

/* ── Number theater: direction-aware color helper ──────────────────────── */

export type NumberDirection = "up" | "down" | "neutral";

export function numberColor(direction: NumberDirection): string {
  switch (direction) {
    case "up":
      return "rgb(74 222 128)"; // emerald-400
    case "down":
      return "rgb(248 113 113)"; // red-400
    default:
      return "rgb(148 163 184)"; // slate-400
  }
}

/* ── Touch target minimum (Apple HIG 44pt = 44px at 1x) ────────────────── */

export const MIN_TOUCH_TARGET_PX = 44;

/**
 * Pad a style object so the element meets Apple's 44pt minimum touch target,
 * even when the visible content is smaller.
 */
export function ensureTouchTarget(
  style: Record<string, string | number> = {},
): Record<string, string | number> {
  return {
    minWidth: MIN_TOUCH_TARGET_PX,
    minHeight: MIN_TOUCH_TARGET_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };
}

/* ── Density modes (Linear / Notion / Raycast) ─────────────────────────── */

export type Density = "comfortable" | "compact" | "dense";

export const densityRowHeight: Record<Density, number> = {
  comfortable: 56,
  compact: 44,
  dense: 36,
};

export function rowPadding(density: Density): number {
  return density === "dense" ? 6 : density === "compact" ? 10 : 14;
}

/* ── Stagger helper for masonic grids ──────────────────────────────────── */

export function staggerDelay(index: number, stepMs = 40, capMs = 320): number {
  return Math.min(index * stepMs, capMs) / 1000;
}

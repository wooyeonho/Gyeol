/**
 * World-class design playbook — synthesized from 18+ top-tier apps.
 *
 * Source apps analyzed (see WORLD_CLASS_APPS_RESEARCH.md):
 *   Apple HIG, Linear, Figma, Notion, Arc Browser, Airbnb DLS, Stripe,
 *   Robinhood, Headspace/Calm, Duolingo, Pinterest, Instagram, Procreate,
 *   Bear, Things 3, Raycast, Apple Weather, Spotify.
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
  {
    id: "pressure-brush",
    source: "Procreate",
    rule: "Canvas input must respect pressure/velocity — map to opacity/size.",
    appliesTo: ["portrait-canvas", "room-editor"],
  },
  {
    id: "typo-first-reading",
    source: "Bear",
    rule: "Reading surfaces prefer a 62ch measure, 1.6 line-height, serif or humanist sans.",
    appliesTo: ["memory-reader", "diary", "story"],
  },
  {
    id: "whitespace-as-feature",
    source: "Things 3",
    rule: "Quick-entry surfaces must never look cramped — top/bottom 16px min even in dense modes.",
    appliesTo: ["quick-entry", "slash-menu"],
  },
  {
    id: "inline-command-result",
    source: "Raycast",
    rule: "Global commands must render inline results in the same surface, not in a new page.",
    appliesTo: ["command-palette", "search-modal"],
  },
  {
    id: "ambient-sky",
    source: "Apple Weather",
    rule: "Idle backgrounds should reflect real-world time-of-day and weather as a soft tint.",
    appliesTo: ["home-hero", "room-ambient"],
  },
  {
    id: "cover-centric",
    source: "Spotify",
    rule: "Media cards prioritize a single dominant image — min 60% of card area.",
    appliesTo: ["album-card", "portrait-gallery"],
  },
  {
    id: "vital-pulse",
    source: "결 (original)",
    rule: "Living-presence vitals must pulse on a 60fps raf loop, never setInterval — use sine, not step.",
    appliesTo: ["living-presence-beacon", "creature-idle"],
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

/* ── Ambient-sky tint (Apple Weather) ──────────────────────────────────── */

export type TimeOfDay = "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "night";

/** Bucket a Date into a 6-band time-of-day key. */
export function timeOfDayFromDate(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h < 6) return "night";
  if (h < 9) return "dawn";
  if (h < 12) return "morning";
  if (h < 14) return "noon";
  if (h < 18) return "afternoon";
  if (h < 21) return "dusk";
  return "night";
}

/**
 * Return a CSS gradient string for the ambient-sky background tint that
 * Apple Weather uses. Pure function — no DOM access.
 */
export function ambientSkyTint(tod: TimeOfDay): string {
  switch (tod) {
    case "dawn":
      return "linear-gradient(180deg, rgb(255 214 170) 0%, rgb(255 170 146) 50%, rgb(136 122 184) 100%)";
    case "morning":
      return "linear-gradient(180deg, rgb(186 230 253) 0%, rgb(191 219 254) 50%, rgb(224 242 254) 100%)";
    case "noon":
      return "linear-gradient(180deg, rgb(147 197 253) 0%, rgb(191 219 254) 50%, rgb(224 242 254) 100%)";
    case "afternoon":
      return "linear-gradient(180deg, rgb(191 219 254) 0%, rgb(254 215 170) 50%, rgb(253 186 116) 100%)";
    case "dusk":
      return "linear-gradient(180deg, rgb(251 146 60) 0%, rgb(244 114 182) 50%, rgb(139 92 246) 100%)";
    case "night":
      return "linear-gradient(180deg, rgb(15 23 42) 0%, rgb(30 27 75) 50%, rgb(88 28 135) 100%)";
  }
}

/* ── Vital pulse helper (결 living-presence) ──────────────────────────── */

/**
 * Compute a normalized sine pulse in [0, 1] that completes one beat in
 * 60 / bpm seconds. Use this to drive opacity / scale of heart visuals.
 * Intentionally deterministic so tests can assert exact values.
 */
export function vitalPulse(bpm: number, tMs: number): number {
  const beatMs = 60_000 / Math.max(30, bpm);
  const phase = (tMs % beatMs) / beatMs; // 0..1
  // Two-lobe heartbeat: a sharp lub-dub. cosine squared gives smooth envelope.
  const lub = Math.pow(Math.cos((phase - 0.15) * Math.PI * 3), 2);
  const dub = Math.pow(Math.cos((phase - 0.42) * Math.PI * 4), 2) * 0.6;
  const raw = Math.max(lub, dub);
  return Math.max(0, Math.min(1, raw));
}

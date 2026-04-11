/**
 * World-class creative tool patterns — from 12+ top creative apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.12):
 *   Procreate, Photoshop/Lightroom, Blender, DaVinci Resolve, Final Cut,
 *   Capcut, Figma, Framer, Canva, Pixelmator Pro, Ableton Live, Logic Pro.
 */

export type CreativePrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const CREATIVE_PRINCIPLES: readonly CreativePrinciple[] = [
  { id: "pressure-brush", source: "Procreate", rule: "Brush size/opacity respond to pressure and velocity in the same gesture." },
  { id: "preset-ecosystem", source: "Photoshop / Lightroom", rule: "A thriving preset marketplace is part of the product, not an afterthought." },
  { id: "open-3d-pipeline", source: "Blender", rule: "Every stage of the pipeline is editable in the same app; no import/export ritual." },
  { id: "free-full-edit", source: "DaVinci Resolve", rule: "The free tier must be genuinely professional — not crippled." },
  { id: "magnetic-timeline", source: "Final Cut Pro", rule: "Clips repel and attract each other so users don't leave gaps accidentally." },
  { id: "social-edit-presets", source: "Capcut", rule: "Presets are shaped by social platform aspect ratios and trending sounds." },
  { id: "vector-coop", source: "Figma", rule: "Vector edits are real-time multiplayer with object-level conflict-free merging." },
  { id: "site-builder", source: "Framer", rule: "Design tool doubles as a publishing tool — no handoff to engineering." },
  { id: "template-library", source: "Canva", rule: "A vast, searchable template library is the fastest on-ramp for beginners." },
  { id: "ml-edit", source: "Pixelmator Pro", rule: "ML actions (remove background, enhance, super-res) are one-click primary actions." },
  { id: "session-view", source: "Ableton Live", rule: "Scenes and clips arrange in a grid you can trigger live." },
  { id: "track-detail", source: "Logic Pro", rule: "Every track row reveals deep controls without leaving the arrangement." },
] as const;

/* ── Pressure curve mapping ──────────────────────────────────────────── */

/**
 * Map a raw pressure value [0..1] to an output value using a gamma curve.
 * gamma < 1 makes the curve more sensitive at low pressure (soft touch).
 */
export function pressureCurve(raw: number, gamma = 0.8): number {
  const clamped = Math.max(0, Math.min(1, raw));
  return Math.pow(clamped, gamma);
}

/* ── Magnetic timeline ──────────────────────────────────────────────── */

export type Clip = {
  id: string;
  startMs: number;
  durationMs: number;
  track: number;
};

/**
 * After removing a clip, collapse trailing clips on the same track to close
 * the gap (Final Cut magnetic timeline behavior).
 */
export function collapseGap(clips: readonly Clip[], removedId: string): Clip[] {
  const removed = clips.find((c) => c.id === removedId);
  if (!removed) return [...clips];
  return clips
    .filter((c) => c.id !== removedId)
    .map((c) => {
      if (c.track !== removed.track || c.startMs < removed.startMs) return c;
      return { ...c, startMs: c.startMs - removed.durationMs };
    });
}

/* ── Aspect ratio presets ───────────────────────────────────────────── */

export const SOCIAL_ASPECT_RATIOS = {
  "square": { w: 1, h: 1, label: "정사각" },
  "portrait-4-5": { w: 4, h: 5, label: "피드 포트레이트" },
  "portrait-9-16": { w: 9, h: 16, label: "스토리/릴/쇼츠" },
  "landscape-16-9": { w: 16, h: 9, label: "가로 와이드" },
  "cinematic-21-9": { w: 21, h: 9, label: "시네마틱" },
} as const;

export type AspectKey = keyof typeof SOCIAL_ASPECT_RATIOS;

export function fitToAspect(
  sourceWidth: number,
  sourceHeight: number,
  targetKey: AspectKey,
): { width: number; height: number } {
  const target = SOCIAL_ASPECT_RATIOS[targetKey];
  const targetRatio = target.w / target.h;
  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > targetRatio) {
    return { width: Math.round(sourceHeight * targetRatio), height: sourceHeight };
  }
  return { width: sourceWidth, height: Math.round(sourceWidth / targetRatio) };
}

"use client";

import { useMemo } from "react";
import {
  renderCharacterSvg,
  deriveMood,
  type CharacterMood,
  type CharacterStage,
} from "@/lib/genome/svg-character";
import type { CreatureDNA } from "@/lib/genome/dna";

type CharacterProps = {
  dna: CreatureDNA;
  mood?: CharacterMood;
  stage?: CharacterStage;
  vitality?: number;
  energy?: number;
  /** Pixel size of the rendered character (square). Defaults to 280. */
  size?: number;
  /** Disable idle bounce/tilt — for share cards / OG images. */
  static_?: boolean;
  className?: string;
  onTap?: () => void;
  onLongPress?: () => void;
};

// Quantize continuous values so small state updates don't rebuild the SVG.
// Vitality and energy move in analog ways (e.g. slow decay); rounding to 0.2
// buckets keeps the creature visually stable across frequent re-renders while
// still reacting to real changes.
const bucket = (v: number | undefined, step = 0.2) =>
  v == null ? 0.5 : Math.round(v / step) * step;

// Build a stable cache key from inputs. React can't detect deep equality on
// plain objects, so we hash the DNA axes into a single string. Combined with
// the quantized scalars, this prevents the SVG string from being rebuilt on
// every agent-state update — which in turn stops the flicker caused by
// replacing the inline SVG DOM via dangerouslySetInnerHTML.
function dnaKey(dna: CreatureDNA): string {
  const keys = Object.keys(dna).sort();
  let out = "";
  for (const k of keys) {
    const v = (dna as Record<string, number>)[k];
    out += `${k[0]}${Math.round(v * 100)}|`;
  }
  return out;
}

/**
 * Fullscreen-friendly procedural creature rendered as inline SVG.
 *
 * - Deterministic: same DNA + mood always renders the same.
 * - Stable across agent-state updates — object-identity changes on the DNA
 *   prop do not cause a re-render unless the underlying axis values or the
 *   quantized mood/vitality/energy actually shift.
 * - Animated via CSS keyframes (breathe + sway). Respects prefers-reduced-motion.
 * - Long-press (500ms hold) and tap callbacks for the home screen interactions.
 */
export function Character({
  dna,
  mood,
  stage,
  vitality,
  energy,
  size,
  static_ = false,
  className,
  onTap,
  onLongPress,
}: CharacterProps) {
  const qVitality = bucket(vitality);
  const qEnergy = bucket(energy);
  const dnaHash = useMemo(() => dnaKey(dna), [dna]);

  const { svg, palette } = useMemo(
    () => renderCharacterSvg({ dna, mood, stage, vitality: qVitality, energy: qEnergy }),
    // Only the primitive cache-key deps — not the dna object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dnaHash, mood, stage, qVitality, qEnergy]
  );

  const handlers = useMemo(() => {
    if (!onTap && !onLongPress) return {};
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;
    const start = () => {
      fired = false;
      if (onLongPress) {
        timer = setTimeout(() => {
          fired = true;
          onLongPress();
        }, 500);
      }
    };
    const end = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (!fired && onTap) onTap();
    };
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    return {
      onPointerDown: start,
      onPointerUp: end,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
    };
  }, [onTap, onLongPress]);

  const interactive = Boolean(onTap || onLongPress);

  return (
    <div
      className={`character-root${interactive ? " character-interactive" : ""}${static_ ? " character-static" : " character-alive"} ${className ?? ""}`}
      style={{
        ...(size != null ? { width: size, height: size } : null),
        ["--char-aura" as string]: palette.aura,
        ["--char-primary" as string]: palette.primary,
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "creature" : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") onTap?.(); } : undefined}
      {...handlers}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export { deriveMood };
export type { CharacterMood, CharacterStage };


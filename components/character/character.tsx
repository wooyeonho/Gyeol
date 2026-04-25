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

/**
 * Fullscreen-friendly procedural creature rendered as inline SVG.
 *
 * - Deterministic: same DNA + mood always renders the same.
 * - Animated via CSS keyframes (breathe + sway). Respects prefers-reduced-motion.
 * - Long-press (500ms hold) and tap callbacks for the home screen interactions.
 */
export function Character({
  dna,
  mood,
  stage,
  vitality,
  energy,
  size = 280,
  static_ = false,
  className,
  onTap,
  onLongPress,
}: CharacterProps) {
  const { svg, palette } = useMemo(
    () => renderCharacterSvg({ dna, mood, stage, vitality, energy }),
    [dna, mood, stage, vitality, energy]
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
        width: size,
        height: size,
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

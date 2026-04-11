"use client";

/**
 * EmotionalAura — the living halo that surrounds the Gyeol creature.
 *
 * Pure CSS/SVG, no WebGL, no framer-motion required. Renders:
 *   - A radial gradient core with pulse animation
 *   - Optional hidden-emotion undertone
 *   - Orbiting particles emitted at `particleRate`
 *
 * Respects prefers-reduced-motion and caps particle count on small screens.
 */

import { useEffect, useMemo, useState } from "react";
import {
  auraFor,
  auraPulseDurationSec,
  auraToCssGradient,
  layerAura,
  type Mood,
} from "@/lib/identity/aura";

export function EmotionalAura({
  mood,
  hiddenMood,
  size = 220,
  showParticles = true,
  showLabel = false,
  className = "",
}: {
  mood: Mood;
  hiddenMood?: Mood | null;
  size?: number;
  showParticles?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const aura = useMemo(
    () => (hiddenMood ? layerAura(mood, hiddenMood) : auraFor(mood)),
    [mood, hiddenMood],
  );

  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    // Subscribe to media-query changes; the initial value is handled by
    // lazy useState above so we never call setState inside the effect body
    // except as a change callback, which is the idiomatic pattern.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const gradient = auraToCssGradient(aura);
  const period = auraPulseDurationSec(aura);
  const particleCount = showParticles && !reduced
    ? Math.min(14, Math.round(aura.particleRate))
    : 0;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${mood} aura`}
      role="img"
    >
      {/* Outer halo */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
          filter: "blur(22px)",
          opacity: 0.7 + aura.intensity * 0.25,
          animation: reduced
            ? undefined
            : `aura-pulse ${period.toFixed(2)}s ease-in-out infinite`,
        }}
      />
      {/* Mid halo */}
      <div
        className="absolute inset-6 rounded-full"
        style={{
          background: gradient,
          filter: "blur(10px)",
          opacity: 0.85,
        }}
      />
      {/* Core */}
      <div
        className="absolute inset-12 rounded-full"
        style={{
          background: `hsl(${aura.hue}, 90%, ${55 + aura.intensity * 20}%)`,
          boxShadow: `0 0 ${20 + aura.intensity * 40}px hsl(${aura.hue}, 90%, 65%)`,
        }}
      />
      {/* Orbiting particles */}
      {particleCount > 0 && (
        <svg
          className="absolute inset-0"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {Array.from({ length: particleCount }).map((_, i) => {
            const delay = (i / particleCount) * period;
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 38 + (i % 3) * 4;
            const cx = 50 + Math.cos(angle) * radius;
            const cy = 50 + Math.sin(angle) * radius;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="1.2"
                fill={`hsl(${aura.hue}, 90%, 75%)`}
                style={{
                  opacity: 0.7,
                  animation: reduced
                    ? undefined
                    : `aura-orbit ${(period * 3).toFixed(2)}s linear ${delay.toFixed(2)}s infinite`,
                  transformOrigin: "50% 50%",
                }}
              />
            );
          })}
        </svg>
      )}
      {/* Label */}
      {showLabel && (
        <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
          {labelFor(mood)}
          {hiddenMood && hiddenMood !== mood && (
            <span className="ml-1.5 text-neutral-400">
              · {labelFor(hiddenMood)}
            </span>
          )}
        </div>
      )}
      <style jsx>{`
        @keyframes aura-pulse {
          0%, 100% { transform: scale(0.96); opacity: 0.85; }
          50%      { transform: scale(1.04); opacity: 1; }
        }
        @keyframes aura-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function labelFor(mood: Mood): string {
  const m: Record<Mood, string> = {
    joyful: "기쁨", calm: "평온", curious: "호기심", tender: "다정", grateful: "감사",
    playful: "장난", wistful: "그리움", contemplative: "사색", melancholy: "우울",
    anxious: "불안", lonely: "외로움", hurt: "상처", angry: "분노", afraid: "두려움",
    awestruck: "경이", determined: "결연", shy: "수줍음", affectionate: "애정",
    mischievous: "짓궂음", dreaming: "몽환", bored: "권태", hopeful: "희망",
    confused: "혼란", embarrassed: "부끄러움", loving: "사랑",
  };
  return m[mood] ?? mood;
}

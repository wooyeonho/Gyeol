"use client";

import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

type PresenceSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<PresenceSize, string> = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

/**
 * Map motionBias → orbit animation.
 * Gentle = 12s slow orbit, Kinetic = 8s fast orbit, Mystic = 18s ethereal drift.
 */
function getOrbitAnimation(motionBias: string): string {
  switch (motionBias) {
    case "kinetic":
      return "voidOrbitFast 8s ease-in-out infinite";
    case "mystic":
      return "voidOrbitSlow 18s ease-in-out infinite";
    default:
      return "voidOrbit 12s ease-in-out infinite";
  }
}

/**
 * Derive a breathing animation duration from the animation field.
 * float = gentle 4s, pulse-fast = snappy 2s, breathe-slow = deep 6s.
 */
function getBreatheSpeed(animation: string | undefined): string {
  switch (animation) {
    case "pulse-fast":
      return "2s";
    case "breathe-slow":
      return "6s";
    default:
      return "4s";
  }
}

export function IdentityPresence({
  appearance,
  size = "md",
}: {
  appearance: ResolvedIdentityAppearance;
  size?: PresenceSize;
}) {
  const sizeClass = SIZE_CLASS[size];
  const nodes = Array.from({ length: appearance.presence.nodeCount });
  const bands = Array.from({ length: appearance.presence.bandCount });

  const motionBias = appearance.scene.motionBias;
  const glowIntensity = appearance.visual.glow;
  const animationType = appearance.visual.animation;
  const particleCount = appearance.visual.particles;
  const breatheSpeed = getBreatheSpeed(animationType);
  const orbitAnim = getOrbitAnimation(motionBias);

  // Glow size scales with the glow field (40–100 → 20px–60px spread)
  const glowSpread = 20 + ((glowIntensity - 40) / 60) * 40;
  const isLowVitality = appearance.vitality < 0.3;

  // Subtle floating particles (derived from particleCount, capped at 6 for perf)
  const sparkles = Array.from({ length: Math.min(Math.round(particleCount / 8), 6) });

  return (
    <div
      className={`identity-presence group relative ${sizeClass} shrink-0`}
      style={{
        filter: isLowVitality ? "grayscale(70%) opacity(55%)" : "none",
      }}
    >
      {/* Ambient glow ring — breathes */}
      <div
        className="absolute -inset-[25%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${appearance.palette.ring}, transparent 68%)`,
          opacity: 0.7,
          animation: `creatureBreathe ${breatheSpeed} ease-in-out infinite`,
        }}
      />

      {/* Orbit ring — rotates per motionBias */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full border border-white/[0.06]"
        style={{
          width: "140%",
          height: "140%",
          animation: orbitAnim,
          boxShadow: `inset 0 0 12px ${appearance.palette.ring}`,
        }}
      />

      {/* Shell body */}
      <div
        className="relative isolate h-full w-full overflow-hidden border border-white/10"
        style={{
          borderRadius: appearance.presence.shellRadius,
          background: `linear-gradient(135deg, ${appearance.palette.primary}30 0%, ${appearance.palette.secondary}20 55%, ${appearance.palette.background} 100%)`,
          boxShadow: `0 0 ${glowSpread}px ${appearance.palette.ring}, inset 0 0 20px ${appearance.palette.primary}18`,
        }}
      >
        {/* Primary radial spots — gives depth/3D feel */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 28%, ${appearance.palette.primary}90, transparent 38%), radial-gradient(circle at 72% 70%, ${appearance.palette.secondary}90, transparent 36%)`,
          }}
        />

        {/* Core center — pulses */}
        <div
          className="absolute left-1/2 top-1/2 border border-white/[0.08]"
          style={{
            width: `${appearance.presence.coreScale * 100}%`,
            height: `${appearance.presence.coreScale * 100}%`,
            transform: "translate(-50%, -50%)",
            borderRadius: appearance.presence.shellRadius,
            background: `radial-gradient(circle, ${appearance.palette.primary}44, transparent 70%)`,
            animation: `creatureBreathe ${breatheSpeed} ease-in-out infinite`,
          }}
        />

        {/* Orbital bands — tilt + slow rotate */}
        {bands.map((_, index) => (
          <div
            key={`band-${index}`}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: `${54 - index * 6}%`,
              height: `${12 + index * 4}%`,
              background: `linear-gradient(90deg, transparent, ${appearance.palette.primary}30, transparent)`,
              transform: `translate(-50%, -50%) rotate(${appearance.presence.bandTilt + index * 18}deg)`,
              opacity: 0.22 + index * 0.08,
              animation: `voidOrbitSlow ${16 + index * 4}s linear infinite`,
            }}
          />
        ))}

        {/* Orbiting nodes — rotate around center */}
        {nodes.map((_, index) => {
          const angle = ((360 / nodes.length) * index + appearance.presence.orbitOffset) * (Math.PI / 180);
          const radius = 28 + (index % 2) * 6;
          const left = 50 + Math.cos(angle) * radius;
          const top = 50 + Math.sin(angle) * (radius * 0.76);
          const sizePx = 5 + (index % 3) * 2.5;
          return (
            <div
              key={`node-${index}`}
              className="absolute rounded-full"
              style={{
                left: `calc(${left}% - ${sizePx / 2}px)`,
                top: `calc(${top}% - ${sizePx / 2}px)`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                background: `radial-gradient(circle, ${appearance.palette.primary}80, white 20%, transparent 70%)`,
                boxShadow: `0 0 ${sizePx}px ${appearance.palette.primary}60`,
                animation: `creatureBreathe ${3 + index * 0.5}s ease-in-out ${index * 0.3}s infinite`,
              }}
            />
          );
        })}

        {/* Floating sparkle particles — drift up */}
        {sparkles.map((_, i) => {
          const x = 20 + (i * 60) / Math.max(sparkles.length - 1, 1);
          const delay = i * 1.2;
          return (
            <div
              key={`sparkle-${i}`}
              className="absolute h-1 w-1 rounded-full bg-white/50"
              style={{
                left: `${x}%`,
                bottom: "20%",
                animation: `floatUp ${3 + i * 0.4}s ease-out ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* Hover brightness + scale on group-hover */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06] group-hover:scale-105" />
    </div>
  );
}

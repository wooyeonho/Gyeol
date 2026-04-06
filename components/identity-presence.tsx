"use client";

import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

type PresenceSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<PresenceSize, { box: string; core: number }> = {
  sm: { box: "h-14 w-14", core: 56 },
  md: { box: "h-20 w-20", core: 80 },
  lg: { box: "h-28 w-28", core: 112 },
};

/**
 * Map motionBias → orbit animation.
 * Gentle = 12s, Kinetic = 8s, Mystic = 18s.
 */
function getOrbitDuration(motionBias: string): number {
  switch (motionBias) {
    case "kinetic":
      return 8;
    case "mystic":
      return 18;
    default:
      return 12;
  }
}

/**
 * Derive breathing cycle length from visual.animation.
 * pulse-fast = snappy 2s, breathe-slow = deep 6s, default = 4s.
 */
function getBreatheMs(animation: string | undefined): number {
  switch (animation) {
    case "pulse-fast":
      return 2000;
    case "breathe-slow":
      return 6000;
    default:
      return 4000;
  }
}

export function IdentityPresence({
  appearance,
  size = "md",
}: {
  appearance: ResolvedIdentityAppearance;
  size?: PresenceSize;
}) {
  const { box, core: corePx } = SIZE_MAP[size];
  const nodes = Array.from({ length: appearance.presence.nodeCount });
  const bands = Array.from({ length: appearance.presence.bandCount });

  const motionBias = appearance.scene.motionBias;
  const glowIntensity = appearance.visual.glow;
  const animationType = appearance.visual.animation;
  const particleCount = appearance.visual.particles;
  const breatheMs = getBreatheMs(animationType);
  const orbitSec = getOrbitDuration(motionBias);

  // Glow spread scales linearly from visual.glow (40→20px, 100→60px)
  const glowSpread = Math.max(12, 20 + ((glowIntensity - 40) / 60) * 40);
  const isLowVitality = appearance.vitality < 0.3;

  // Organic floating particles (capped at 5 for perf)
  const sparkleCount = Math.min(Math.max(Math.round(particleCount / 8), 2), 5);

  return (
    <div
      className={`identity-presence group relative ${box} shrink-0`}
      style={{
        filter: isLowVitality ? "grayscale(65%) opacity(50%)" : "none",
      }}
    >
      {/* ── Ambient glow ring — breathes in and out ── */}
      <div
        className="absolute -inset-[30%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${appearance.palette.ring}55, ${appearance.palette.primary}15 45%, transparent 70%)`,
          animation: `creatureBreathe ${breatheMs}ms ease-in-out infinite`,
        }}
      />

      {/* ── Orbit ring — rotating halo ── */}
      <div
        className="absolute rounded-full"
        style={{
          width: "140%",
          height: "140%",
          left: "-20%",
          top: "-20%",
          border: `1px solid rgba(255,255,255,0.05)`,
          boxShadow: `inset 0 0 14px ${appearance.palette.ring}30`,
          animation: `creatureOrbit ${orbitSec}s linear infinite`,
        }}
      />

      {/* ── Second orbit ring (counter-rotate for depth) ── */}
      <div
        className="absolute rounded-full"
        style={{
          width: "125%",
          height: "125%",
          left: "-12.5%",
          top: "-12.5%",
          border: `1px solid rgba(255,255,255,0.03)`,
          animation: `creatureOrbit ${orbitSec * 1.7}s linear infinite reverse`,
        }}
      />

      {/* ── Shell body ── */}
      <div
        className="relative isolate h-full w-full overflow-hidden border border-white/10"
        style={{
          borderRadius: appearance.presence.shellRadius,
          background: `linear-gradient(135deg, ${appearance.palette.primary}35 0%, ${appearance.palette.secondary}22 55%, ${appearance.palette.background} 100%)`,
          boxShadow: `0 0 ${glowSpread}px ${appearance.palette.ring}, inset 0 0 ${corePx * 0.25}px ${appearance.palette.primary}18`,
        }}
      >
        {/* Primary radial spots — organic depth */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 32% 30%, ${appearance.palette.primary}55 0%, transparent 42%), radial-gradient(circle at 70% 68%, ${appearance.palette.secondary}50 0%, transparent 40%)`,
          }}
        />

        {/* Core center — pulses like a heartbeat */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: `${appearance.presence.coreScale * 100}%`,
            height: `${appearance.presence.coreScale * 100}%`,
            transform: "translate(-50%, -50%)",
            borderRadius: appearance.presence.shellRadius,
            background: `radial-gradient(circle, ${appearance.palette.primary}66 0%, ${appearance.palette.primary}22 40%, transparent 72%)`,
            border: `1px solid ${appearance.palette.primary}18`,
            animation: `creatureHeartbeat ${breatheMs}ms ease-in-out infinite`,
          }}
        />

        {/* Inner luminous spot — the "eye" / soul */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: `${appearance.presence.coreScale * 40}%`,
            height: `${appearance.presence.coreScale * 40}%`,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle, white 0%, ${appearance.palette.primary}80 50%, transparent 100%)`,
            opacity: 0.6,
            animation: `creatureBreathe ${breatheMs * 0.8}ms ease-in-out ${breatheMs * 0.2}ms infinite`,
          }}
        />

        {/* Orbital bands — tilted, slowly drifting */}
        {bands.map((_, index) => (
          <div
            key={`band-${index}`}
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${54 - index * 5}%`,
              height: `${14 + index * 3}%`,
              background: `linear-gradient(90deg, transparent 5%, ${appearance.palette.primary}25, transparent 95%)`,
              transform: `translate(-50%, -50%) rotate(${appearance.presence.bandTilt + index * 22}deg)`,
              opacity: 0.25 + index * 0.07,
              borderRadius: "50%",
              animation: `creatureOrbit ${18 + index * 5}s linear infinite${index % 2 === 1 ? " reverse" : ""}`,
            }}
          />
        ))}

        {/* Orbiting nodes — tiny satellites */}
        {nodes.map((_, index) => {
          const angle =
            ((360 / nodes.length) * index + appearance.presence.orbitOffset) *
            (Math.PI / 180);
          const radius = 28 + (index % 2) * 7;
          const left = 50 + Math.cos(angle) * radius;
          const top = 50 + Math.sin(angle) * (radius * 0.78);
          const sizePx = 4 + (index % 3) * 2;
          const delay = index * 0.4;
          return (
            <div
              key={`node-${index}`}
              className="absolute rounded-full"
              style={{
                left: `calc(${left}% - ${sizePx / 2}px)`,
                top: `calc(${top}% - ${sizePx / 2}px)`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                background: `radial-gradient(circle, ${appearance.palette.primary} 0%, ${appearance.palette.primary}60 60%, transparent 100%)`,
                boxShadow: `0 0 ${sizePx + 2}px ${appearance.palette.primary}50`,
                animation: `creatureNodePulse ${2.5 + index * 0.6}s ease-in-out ${delay}s infinite`,
              }}
            />
          );
        })}

        {/* Floating organic particles — drift in multiple directions */}
        {Array.from({ length: sparkleCount }).map((_, i) => {
          const x = 15 + (i * 70) / Math.max(sparkleCount - 1, 1);
          const delay = i * 0.8;
          const isEven = i % 2 === 0;
          return (
            <div
              key={`sparkle-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                bottom: isEven ? "25%" : "40%",
                width: `${2 + (i % 2)}px`,
                height: `${2 + (i % 2)}px`,
                background: `${appearance.palette.primary}80`,
                boxShadow: `0 0 4px ${appearance.palette.primary}40`,
                animation: `${isEven ? "creatureSparkleUp" : "creatureSparkleDrift"} ${3.5 + i * 0.5}s ease-in-out ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* Hover brightness + subtle grow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06] group-hover:scale-110"
      />
    </div>
  );
}

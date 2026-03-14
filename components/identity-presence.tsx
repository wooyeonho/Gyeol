"use client";

import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

type PresenceSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<PresenceSize, string> = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

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

  return (
    <div
      className={`relative ${sizeClass} shrink-0 transition-all duration-1000`}
      style={{
        filter: appearance.vitality < 0.3 ? "grayscale(80%) opacity(60%) blur(1px)" : "none",
      }}
    >
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-80"
        style={{ background: `radial-gradient(circle, ${appearance.palette.ring}, transparent 72%)` }}
      />
      <div
        className="relative isolate h-full w-full overflow-hidden border border-white/10"
        style={{
          borderRadius: appearance.presence.shellRadius,
          background: `linear-gradient(135deg, ${appearance.palette.primary}26 0%, ${appearance.palette.secondary}18 55%, ${appearance.palette.background} 100%)`,
          boxShadow: `0 0 40px ${appearance.palette.ring}`,
        }}
      >
        <div
          className="absolute inset-0 opacity-85"
          style={{
            background: `radial-gradient(circle at 28% 28%, ${appearance.palette.primary}88, transparent 36%), radial-gradient(circle at 74% 72%, ${appearance.palette.secondary}88, transparent 34%)`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 border border-white/10 bg-white/[0.04]"
          style={{
            width: `${appearance.presence.coreScale * 100}%`,
            height: `${appearance.presence.coreScale * 100}%`,
            transform: "translate(-50%, -50%)",
            borderRadius: appearance.presence.shellRadius,
          }}
        />

        {bands.map((_, index) => (
          <div
            key={`band-${index}`}
            className="absolute left-1/2 top-1/2 rounded-full bg-white/12"
            style={{
              width: `${54 - index * 6}%`,
              height: `${12 + index * 4}%`,
              transform: `translate(-50%, -50%) rotate(${appearance.presence.bandTilt + index * 18}deg)`,
              opacity: 0.18 + index * 0.06,
            }}
          />
        ))}

        {nodes.map((_, index) => {
          const angle = ((360 / nodes.length) * index + appearance.presence.orbitOffset) * (Math.PI / 180);
          const left = 50 + Math.cos(angle) * 26;
          const top = 50 + Math.sin(angle) * 20;
          const sizePx = 7 + (index % 3) * 3;
          return (
            <div
              key={`node-${index}`}
              className="absolute rounded-full bg-white/24 blur-[1px]"
              style={{
                left: `calc(${left}% - ${sizePx / 2}px)`,
                top: `calc(${top}% - ${sizePx / 2}px)`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

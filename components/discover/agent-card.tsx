"use client";

import type { ReactNode } from "react";
import { IdentityPresence } from "@/components/identity-presence";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

/**
 * Rich agent card used across the discover section (explore, adopt,
 * leaderboard, social) to present other agents consistently.
 *
 * Uses the agent's scene gradient as a subtle background wash so each
 * card feels unique while sharing the same structural layout.
 */
export function AgentCard({
  appearance,
  name,
  stats,
  chips,
  children,
}: {
  appearance: ResolvedIdentityAppearance;
  name: string;
  /** Key–value stat pills, e.g. [{ label: "Gen", value: "3" }]. */
  stats?: { label: string; value: string }[];
  /** Override chips — defaults to appearance.chips. */
  chips?: string[];
  /** Actions slot: buttons rendered at the bottom. */
  children?: ReactNode;
}) {
  const displayChips = chips ?? appearance.chips;

  return (
    <div
      className="group relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] transition-all duration-300 hover:-translate-y-1 hover:border-white/15 active:scale-[0.98]"
      style={{
        background: appearance.scene?.backgroundGradient
          ? `${appearance.scene.backgroundGradient}, linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(0,0,0,0.4) 100%)`
          : "rgba(255,255,255,0.035)",
      }}
    >
      {/* Overlay gradient for readability */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.75rem]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      <div className="relative z-10 p-4">
        {/* Identity row */}
        <div className="flex items-start gap-3">
          <IdentityPresence appearance={appearance} size="md" />
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
              {appearance.title}
            </p>
            <p className="mt-1.5 text-base font-semibold text-white leading-tight truncate">
              {name}
            </p>
            {(appearance.usageNarrative || appearance.subtitle) && (
              <p className="mt-1 text-xs leading-5 text-white/50 line-clamp-2">
                {appearance.usageNarrative ?? appearance.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        {stats && stats.length > 0 && (
          <div className={`mt-4 grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)` }}>
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.06] bg-black/30 px-2.5 py-2 backdrop-blur-sm"
              >
                <p className="text-[9px] font-medium uppercase tracking-wider text-white/40">
                  {s.label}
                </p>
                <p
                  className="mt-0.5 text-sm font-semibold"
                  style={{ color: appearance.palette.primary }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chips */}
        {displayChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  borderColor: `${appearance.palette.primary}28`,
                  background: `${appearance.palette.primary}10`,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Actions slot */}
        {children && (
          <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>

      {/* Hover glow accent */}
      <div
        className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: appearance.palette.primary }}
      />
    </div>
  );
}

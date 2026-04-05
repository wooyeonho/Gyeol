"use client";

import type { ReactNode } from "react";
import { IdentityPresence } from "@/components/identity-presence";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

/**
 * Unified header for all pages under the Discover (탐색) section.
 *
 * Establishes one consistent visual language across activity, album, social,
 * explore, leaderboard, adopt, market, room, constellation, and compare so
 * that moving between them feels like one product, not eleven.
 */
export function DiscoverPageHeader({
  eyebrow,
  title,
  subtitle,
  appearance,
  children,
  tight = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** When provided, renders the agent's IdentityPresence beside the title. */
  appearance?: ResolvedIdentityAppearance | null;
  /** Optional slot for chips, counts, action buttons rendered under the title. */
  children?: ReactNode;
  /** Use slightly tighter padding — handy for pages with 3D scenes below. */
  tight?: boolean;
}) {
  return (
    <header
      className={`theme-panel rounded-[2rem] shadow-[0_0_80px_rgba(34,211,238,0.05)] ${
        tight ? "p-5" : "p-6"
      }`}
    >
      <div className="flex items-start gap-4">
        {appearance && (
          <div className="flex-shrink-0">
            <IdentityPresence appearance={appearance} size="md" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-200/70">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="theme-text-subtle mt-3 max-w-3xl text-sm leading-6 sm:text-base sm:leading-7">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </header>
  );
}

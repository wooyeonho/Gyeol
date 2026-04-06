"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { IdentityPresence } from "@/components/identity-presence";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";
import { haptic } from "@/lib/micro-interactions";

/**
 * Unified header for all pages under the Discover (탐색) section.
 * Now with back navigation and entrance animation.
 */
export function DiscoverPageHeader({
  eyebrow,
  title,
  subtitle,
  appearance,
  children,
  tight = false,
  backHref = "/discover",
  backLabel,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  appearance?: ResolvedIdentityAppearance | null;
  children?: ReactNode;
  tight?: boolean;
  /** Where the back arrow points. Defaults to /discover hub. */
  backHref?: string;
  /** Optional label next to back arrow. */
  backLabel?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`theme-panel rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.06)] ${
        tight ? "p-5" : "p-6"
      }`}
    >
      {/* Back link */}
      <Link
        href={backHref}
        onClick={() => haptic("tap")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-white/70 active:scale-[0.97]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {backLabel || "Discover"}
      </Link>

      <div className="flex items-start gap-4">
        {appearance && (
          <div className="flex-shrink-0">
            <IdentityPresence appearance={appearance} size="md" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55 sm:text-base sm:leading-relaxed">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </motion.header>
  );
}

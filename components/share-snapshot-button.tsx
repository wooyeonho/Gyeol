"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

/**
 * Compact share button that uses the album/leaderboard pattern: POST to
 * /api/share to create a share_cards row, then surface the resulting URL
 * via navigator.share (mobile) or copy-to-clipboard (desktop).
 *
 * Designed to drop into any page that should be shareable as a snapshot of
 * the user's current creature state (constellation, dreams, future surfaces).
 */
export function ShareSnapshotButton({ label }: { label?: string }) {
  const { t } = useTranslations();
  const [state, setState] = useState<"idle" | "loading" | "copied" | "shared" | "error">("idle");

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/share", { method: "POST" });
      const json = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !json?.url) {
        setState("error");
        setTimeout(() => setState("idle"), 1500);
        return;
      }
      // navigator.share is available on most mobile browsers — gives users the
      // native sheet (Messages, Instagram, etc) which is the most viral path.
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ url: json.url });
          setState("shared");
          setTimeout(() => setState("idle"), 1500);
          return;
        } catch {
          // User cancelled the native sheet — fall through to clipboard copy.
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json.url);
        setState("copied");
        setTimeout(() => setState("idle"), 1800);
      } else {
        setState("error");
        setTimeout(() => setState("idle"), 1500);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1500);
    }
  }

  const displayLabel = (() => {
    switch (state) {
      case "loading":
        return t("share.loading");
      case "copied":
        return t("share.copied");
      case "shared":
        return t("share.shared");
      case "error":
        return t("share.error");
      default:
        return label ?? t("share.button");
    }
  })();

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      disabled={state === "loading"}
      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white/90 disabled:opacity-60"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {displayLabel}
    </motion.button>
  );
}

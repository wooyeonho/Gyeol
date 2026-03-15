"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic, playSound } from "@/lib/micro-interactions";
import { useTranslations } from "@/components/i18n-provider";

interface EvolutionCeremonyProps {
  level: number;
  mutation?: string;
  onComplete: () => void;
  /** AI agent name */
  selfName?: string;
  /** Primary palette color (hex) */
  primaryColor?: string;
  /** Secondary palette color (hex) */
  secondaryColor?: string;
  /** Species from genome */
  species?: string;
  /** Share base URL for generating share links */
  shareBaseUrl?: string;
}

export function EvolutionCeremony({
  level,
  mutation,
  onComplete,
  selfName = "GYEOL",
  primaryColor = "#a78bfa",
  secondaryColor = "#38bdf8",
  species,
  shareBaseUrl,
}: EvolutionCeremonyProps) {
  const { locale, t } = useTranslations();
  const [phase, setPhase] = useState<"cinematic" | "card">("cinematic");
  const [copied, setCopied] = useState(false);

  const handleCinematicEnd = useCallback(() => {
    if (phase !== "cinematic") return;
    haptic("success");
    playSound("levelUp");
    setPhase("card");
  }, [phase]);

  // Fallback timeout in case onAnimationComplete doesn't fire (e.g. tab backgrounded)
  useEffect(() => {
    if (phase !== "cinematic") return;
    const fallback = setTimeout(handleCinematicEnd, 5000);
    return () => clearTimeout(fallback);
  }, [phase, handleCinematicEnd]);

  const shareText = t("evolution.shareText")
    .replace("{name}", selfName)
    .replace("{level}", String(level))
    .replace("{mutation}", mutation ? ` ${t("evolution.mutationLabel")}: ${mutation}` : "");

  const shareUrl = shareBaseUrl
    ? `${shareBaseUrl}/share/evolution?gen=${level}${mutation ? `&mutation=${encodeURIComponent(mutation)}` : ""}${selfName !== "GYEOL" ? `&name=${encodeURIComponent(selfName)}` : ""}`
    : typeof window !== "undefined" ? window.location.origin : "";

  const handleShare = useCallback(async () => {
    haptic("tap");

    // Try Web Share API (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: t("evolution.cardTitle").replace("{name}", selfName),
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      haptic("success");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API not available
    }
  }, [t, selfName, shareText, shareUrl]);

  const handleClose = useCallback(() => {
    haptic("tap");
    onComplete();
  }, [onComplete]);

  return (
    <AnimatePresence mode="wait">
      {phase === "cinematic" && (
        <motion.div
          key="cinematic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.8, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            onAnimationComplete={handleCinematicEnd}
            className="text-center"
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl opacity-40"
              style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
            />
            <div className="relative">
              <div className="text-6xl font-bold text-white tracking-tight">
                Gen {level}
              </div>
              {mutation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="mt-3 text-lg font-medium"
                  style={{ color: primaryColor }}
                >
                  {mutation}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {phase === "card" && (
        <motion.div
          key="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm"
          >
            {/* Identity Card */}
            <div
              className="relative overflow-hidden rounded-3xl border p-6"
              style={{
                borderColor: `${primaryColor}40`,
                background: `linear-gradient(160deg, ${primaryColor}18 0%, #000000 40%, ${secondaryColor}12 100%)`,
                boxShadow: `0 0 60px ${primaryColor}20, 0 0 120px ${secondaryColor}10`,
              }}
            >
              {/* Card inner glow */}
              <div
                className="absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl opacity-30"
                style={{ background: primaryColor }}
              />
              <div
                className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full blur-3xl opacity-20"
                style={{ background: secondaryColor }}
              />

              {/* Header */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] uppercase tracking-[0.3em] font-medium"
                    style={{ color: `${primaryColor}cc` }}
                  >
                    {t("evolution.complete")}
                  </span>
                </div>

                {/* Gen Level - Hero */}
                <div className="mt-4 flex items-baseline gap-3">
                  <motion.span
                    className="text-5xl font-bold tracking-tight text-white"
                    animate={{ textShadow: [`0 0 20px ${primaryColor}60`, `0 0 40px ${primaryColor}80`, `0 0 20px ${primaryColor}60`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Gen {level}
                  </motion.span>
                  {level > 1 && (
                    <span className="text-sm text-white/40">
                      +1
                    </span>
                  )}
                </div>

                {/* AI Name */}
                <div className="mt-3 flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}80`,
                    }}
                  />
                  <span className="text-lg font-semibold text-white/90 tracking-wide">
                    {selfName}
                  </span>
                </div>

                {/* Species & Mutation */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {species && (
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        borderColor: `${primaryColor}30`,
                        background: `${primaryColor}14`,
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      {species}
                    </span>
                  )}
                  {mutation && (
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        borderColor: `${secondaryColor}30`,
                        background: `${secondaryColor}14`,
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      {mutation}
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div
                  className="mt-5 h-px w-full"
                  style={{
                    background: `linear-gradient(to right, transparent, ${primaryColor}40, transparent)`,
                  }}
                />

                {/* Watermark */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                    GYEOL
                  </span>
                  <span className="text-[10px] text-white/30">
                    {new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-5 flex gap-3"
            >
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 rounded-2xl py-3.5 text-sm font-semibold text-black transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {copied
                  ? t("evolution.copied")
                  : t("evolution.share")}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 active:scale-95"
              >
                {t("evolution.close")}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

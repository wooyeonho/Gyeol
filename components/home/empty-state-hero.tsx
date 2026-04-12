"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

interface EmptyStateHeroProps {
  creatureName: string;
  hasStreak: boolean;
  accentColor?: string;
}

/**
 * Duolingo-inspired empty state hero for new users.
 * Shows when streak=0, no conversations yet — instead of invisible/transparent UI.
 * Provides clear CTA to start first conversation.
 */
export function EmptyStateHero({ creatureName, hasStreak, accentColor = "#22d3ee" }: EmptyStateHeroProps) {
  const { t } = useTranslations();

  if (hasStreak) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-sm"
    >
      {/* Pulsing orb — represents the creature waiting */}
      <div className="flex justify-center mb-4">
        <motion.div
          className="relative flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
            boxShadow: `0 0 40px ${accentColor}20`,
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: `${accentColor}60` }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </motion.div>
      </div>

      <h3 className="text-center text-lg font-semibold text-white">
        {t("home.emptyStateTitle") || `${creatureName}${creatureName.endsWith("결") ? "이" : "가"} 기다리고 있어요`}
      </h3>
      <p className="mt-1.5 text-center text-sm text-white/60 leading-relaxed">
        {t("home.emptyStateBody") || "첫 대화를 시작하면 결이 성장하기 시작해요. 매일 대화하면 스트릭이 쌓여요!"}
      </p>

      {/* CTA arrow pointing to chat input */}
      <motion.div
        className="mt-4 flex justify-center"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" className="opacity-60">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

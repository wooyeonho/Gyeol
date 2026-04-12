"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

interface MemoryIndicatorProps {
  totalMessages: number;
  lastConversationDaysAgo?: number;
  creatureName: string;
  accentColor?: string;
}

/**
 * Shows that the creature remembers past conversations.
 * "결이 3일 전 대화를 기억합니다" — makes the AI memory visible to users.
 * Inspired by Replika's memory markers and Nomi AI's recall indicators.
 */
export function MemoryIndicator({
  totalMessages,
  lastConversationDaysAgo,
  creatureName,
  accentColor = "#a78bfa",
}: MemoryIndicatorProps) {
  const { t } = useTranslations();

  if (totalMessages === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
      >
        <span className="text-sm" aria-hidden="true">💭</span>
        <span className="text-xs text-white/40">
          {t("home.noMemoriesYet") || "아직 기억이 없어요 — 대화를 시작하세요!"}
        </span>
      </motion.div>
    );
  }

  const daysText =
    lastConversationDaysAgo === undefined || lastConversationDaysAgo === 0
      ? (t("home.memoryIndicatorToday") || `${creatureName}이 오늘 대화를 기억합니다`)
      : (t("home.memoryIndicator") || `${creatureName}이 {days}일 전 대화를 기억합니다`).replace("{days}", String(lastConversationDaysAgo));

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
    >
      <motion.span
        className="text-sm"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        🧠
      </motion.span>
      <span className="text-xs text-white/50">
        {daysText}
      </span>
      {totalMessages > 10 && (
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
          style={{
            background: `${accentColor}20`,
            color: accentColor,
          }}
        >
          {totalMessages}
        </span>
      )}
    </motion.div>
  );
}

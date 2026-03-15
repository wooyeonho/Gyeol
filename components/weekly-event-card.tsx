"use client";

import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n/config";
import { useTranslations } from "@/components/i18n-provider";
import { formatWeeklyEventCountdown, type WeeklyEventProgress } from "@/lib/engagement/weekly-event";

type WeeklyEventCardProps = {
  locale: Locale;
  progress: WeeklyEventProgress;
  className?: string;
  compact?: boolean;
};

export function WeeklyEventCard({
  locale,
  progress,
  className = "",
  compact = false,
}: WeeklyEventCardProps) {
  const { t } = useTranslations();
  const countdown = formatWeeklyEventCountdown(locale, progress.endsAt);
  const completionRate = Math.min(100, (progress.progress / progress.target) * 100);

  return (
    <div className={`theme-panel rounded-[1.75rem] p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-300">
            {t("weeklyEvent.label")}
          </p>
          <h3 className={`mt-2 font-semibold tracking-tight ${compact ? "text-lg" : "text-2xl"}`}>
            {t("weeklyEvent.title")}
          </h3>
          <p className="theme-text-subtle mt-2 text-sm leading-6">
            {progress.completed
              ? t("weeklyEvent.completedBody")
              : t("weeklyEvent.activeBody")}
          </p>
        </div>
        <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-2 text-sm text-fuchsia-100/90">
          {countdown}
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--theme-border-soft)]">
        <motion.div
          className="h-3 rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300"
          initial={{ width: 0 }}
          animate={{ width: `${completionRate}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="theme-text-muted">
          {t("weeklyEvent.progressLabel").replace("{progress}", String(progress.progress)).replace("{target}", String(progress.target))}
        </span>
        <span className="theme-text-subtle">
          {progress.completed
            ? t("weeklyEvent.rewardClaimed")
            : t("weeklyEvent.remaining").replace("{count}", String(progress.remaining))}
        </span>
      </div>
    </div>
  );
}

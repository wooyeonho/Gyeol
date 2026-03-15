"use client";

import { motion } from "framer-motion";
import { formatWeeklyEventCountdown, type WeeklyEventProgress } from "@/lib/engagement/weekly-event";

type WeeklyEventCardProps = {
  locale: "ko" | "en";
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
  const countdown = formatWeeklyEventCountdown(locale, progress.endsAt);
  const completionRate = Math.min(100, (progress.progress / progress.target) * 100);

  return (
    <div className={`theme-panel rounded-[1.75rem] p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-300">
            {locale === "en" ? "Weekly event" : "주간 이벤트"}
          </p>
          <h3 className={`mt-2 font-semibold tracking-tight ${compact ? "text-lg" : "text-2xl"}`}>
            {locale === "en" ? "10 messages unlock a special drop" : "메시지 10개로 특별 보상 해금"}
          </h3>
          <p className="theme-text-subtle mt-2 text-sm leading-6">
            {progress.completed
              ? locale === "en"
                ? "Completed this week. Keep chatting to stay ahead on the leaderboard."
                : "이번 주 이벤트를 완료했습니다. 계속 대화해서 리더보드 격차를 벌리세요."
              : locale === "en"
                ? "Finish the weekly challenge before the timer ends to claim the special event reward."
                : "타이머가 끝나기 전에 주간 챌린지를 완료하면 특별 이벤트 보상을 받을 수 있습니다."}
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
          {locale === "en"
            ? `${progress.progress}/${progress.target} messages`
            : `${progress.progress}/${progress.target}개 메시지`}
        </span>
        <span className="theme-text-subtle">
          {progress.completed
            ? locale === "en"
              ? "Reward claimed"
              : "보상 획득 완료"
            : locale === "en"
              ? `${progress.remaining} left`
              : `${progress.remaining}개 남음`}
        </span>
      </div>
    </div>
  );
}

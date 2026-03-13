"use client";

import Link from "next/link";
import type { HomeSummaryItem } from "@/components/world-class-hub";

type HomeRecap = {
  goal_loop?: {
    active_goal: string | null;
    long_term_goal?: string | null;
    latest_task?: string | null;
    next_action?: string | null;
    pending_count?: number;
    research_focus: string | null;
    updated_at: string | null;
  };
  next_action: string;
  premium_locked?: boolean;
  streak: {
    days: number;
    today_active: boolean;
  };
  today: {
    activities: number;
    user_messages: number;
  };
  weekly: {
    artifacts: number;
    highlight: string;
    milestones: number;
    user_messages: number;
  };
};

type AsideProps = {
  completionRate: number;
  formatDate: (value: string) => string;
  genLevel: number;
  locale: "ko" | "en";
  missionElements: React.ReactNode;
  mood: string;
  newItemsSinceLastVisit: HomeSummaryItem[];
  quickLinks: Array<{ href: string; label: string }>;
  recentItems: HomeSummaryItem[];
  recap: HomeRecap | null;
  showGrowthPanel: boolean;
  showPlanningPanel: boolean;
  showRecentPanel: boolean;
  summary: string;
  t: (key: string) => string;
  toggleGrowthPanel: () => void;
  togglePlanningPanel: () => void;
  toggleRecentPanel: () => void;
  totalMessages: number;
  evolutionHint: string;
};

function PanelToggle({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
    >
      {children}
    </button>
  );
}

export function WorldClassHubAside({
  formatDate,
  genLevel,
  locale,
  missionElements,
  mood,
  newItemsSinceLastVisit,
  quickLinks,
  recentItems,
  recap,
  showGrowthPanel,
  showPlanningPanel,
  showRecentPanel,
  summary,
  t,
  toggleGrowthPanel,
  togglePlanningPanel,
  toggleRecentPanel,
  evolutionHint,
}: AsideProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.growthPulse")}</p>
            <p className="mt-1 text-sm font-medium text-white">{summary}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            Gen {genLevel}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.currentMood")}</p>
            <p className="mt-1 text-sm text-white/82">{mood}</p>
          </div>
          <div className="rounded-lg bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.nextEvolution")}</p>
            <p className="mt-1 text-sm text-white/82">{evolutionHint}</p>
          </div>
          <div className="rounded-lg bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.newTraces")}</p>
            <p className="mt-1 text-sm text-white/82">
              {newItemsSinceLastVisit.length > 0 ? newItemsSinceLastVisit.length : recentItems.length}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/activity" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
            {t("home.viewActivity")}
          </Link>
          <Link href="/album" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
            {t("home.viewAlbum")}
          </Link>
          <PanelToggle onClick={toggleGrowthPanel}>
            {showGrowthPanel ? t("home.hideGrowthDetails") : t("home.openGrowthDetails")}
          </PanelToggle>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <button type="button" onClick={toggleRecentPanel} className="flex w-full items-start justify-between gap-3 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.recentPanel")}</p>
            <p className="mt-1 text-xs text-white/50">{t("home.recentPanelHint")}</p>
            <p className="mt-2 text-sm font-medium text-white">
              {newItemsSinceLastVisit.length > 0
                ? locale === "en"
                  ? `${newItemsSinceLastVisit.length} new traces were recorded.`
                  : `${newItemsSinceLastVisit.length}개의 새로운 흔적이 기록되었습니다.`
                : t("home.recentFallback")}
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            {locale === "en" ? `${recentItems.length} recent` : `최근 ${recentItems.length}개`}
          </span>
        </button>

        {showRecentPanel && (
          <>
            <div className="mt-3 space-y-2">
              {(newItemsSinceLastVisit.length > 0 ? newItemsSinceLastVisit : recentItems.slice(0, 3)).map((item) => (
                <div key={`${item.kind}-${item.id}`} className="rounded-lg bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-white/55">{item.kind === "milestone" ? (locale === "en" ? "Milestone" : "마일스톤") : (locale === "en" ? "Activity" : "활동")}</p>
                    <p className="text-[11px] text-white/40">{formatDate(item.created_at)}</p>
                  </div>
                  <p className="mt-1 text-sm text-white/82">{item.title}</p>
                </div>
              ))}
              {recentItems.length === 0 && (
                <div className="rounded-lg bg-black/25 p-3 text-sm text-white/55">
                  {locale === "en"
                    ? "Once the first activity appears, a recent change summary will show up here."
                    : "첫 활동이 생기면 여기에서 최근 변화 요약을 바로 볼 수 있습니다."}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/activity" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                {locale === "en" ? "Open recent activity" : "최근 활동 열기"}
              </Link>
              <Link href="/album" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                {locale === "en" ? "Open album again" : "앨범 다시 보기"}
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <button type="button" onClick={toggleGrowthPanel} className="flex w-full items-start justify-between gap-3 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.growthPanel")}</p>
            <p className="mt-1 text-xs text-white/50">{t("home.growthPanelHint")}</p>
            <p className="mt-2 text-sm font-medium text-white">{recap?.next_action ?? t("home.retentionFallback")}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            {locale === "en" ? `streak ${recap?.streak.days ?? 0}` : `연속 ${recap?.streak.days ?? 0}일`}
          </span>
        </button>

        {showGrowthPanel && (
          <>
            {recap?.premium_locked && (
              <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3">
                <p className="text-xs text-cyan-100/75">PRO RECAP</p>
                <p className="mt-1 text-sm text-cyan-50">
                  {locale === "en"
                    ? "Deeper weekly recaps and longer history summaries open on Pro and above."
                    : "더 깊은 주간 리캡과 장기 히스토리 요약은 Pro 이상에서 열립니다."}
                </p>
                <Link href="/plans" className="mt-3 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15">
                  {locale === "en" ? "See upgrade plans" : "플랜 업그레이드 보기"}
                </Link>
              </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.today")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {locale === "en"
                    ? `Messages ${recap?.today.user_messages ?? 0} · Activity ${recap?.today.activities ?? 0}`
                    : `메시지 ${recap?.today.user_messages ?? 0} · 활동 ${recap?.today.activities ?? 0}`}
                </p>
                <p className="mt-1 text-xs text-white/50">{recap?.streak.today_active ? t("home.todayDone") : t("home.todayEmpty")}</p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.thisWeek")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {locale === "en"
                    ? `Messages ${recap?.weekly.user_messages ?? 0} · Milestones ${recap?.weekly.milestones ?? 0}`
                    : `대화 ${recap?.weekly.user_messages ?? 0} · 마일스톤 ${recap?.weekly.milestones ?? 0}`}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {locale === "en" ? `Artifacts ${recap?.weekly.artifacts ?? 0}` : `아티팩트 ${recap?.weekly.artifacts ?? 0}개`}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.weeklyHighlight")}</p>
                <p className="mt-1 text-sm text-white/82">{recap?.weekly.highlight ?? t("home.weeklyFallback")}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <button type="button" onClick={togglePlanningPanel} className="flex w-full items-start justify-between gap-3 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.planningPanel")}</p>
            <p className="mt-1 text-xs text-white/50">{t("home.planningPanelHint")}</p>
            <p className="mt-2 text-sm font-medium text-white">
              {recap?.goal_loop?.next_action ?? recap?.goal_loop?.active_goal ?? t("home.goalLoopSummaryEmpty")}
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            {locale === "en"
              ? `${recap?.goal_loop?.pending_count ?? 0} tasks`
              : `대기 태스크 ${recap?.goal_loop?.pending_count ?? 0}개`}
          </span>
        </button>

        {showPlanningPanel && (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "current goal" : "현재 목표"}</p>
                <p className="mt-1 text-sm text-white/82">{recap?.goal_loop?.active_goal ?? t("home.goalLoopCurrentEmpty")}</p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "long-term direction" : "장기 방향"}</p>
                <p className="mt-1 text-sm text-white/82">
                  {recap?.goal_loop?.long_term_goal ?? recap?.goal_loop?.active_goal ?? t("home.goalLoopCurrentEmpty")}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "research next" : "추가 조사 포인트"}</p>
                <p className="mt-1 text-sm text-white/82">
                  {recap?.goal_loop?.latest_task ??
                    recap?.goal_loop?.research_focus ??
                    t("home.goalLoopResearchEmpty")}
                </p>
              </div>
            </div>

            {missionElements}

            <div className="mt-3 flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

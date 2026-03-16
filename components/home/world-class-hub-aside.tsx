"use client";

import Link from "next/link";
import type { HomeSummaryItem } from "@/components/world-class-hub";
import { StreakDisplay } from "@/components/streak-display";

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
    weekly_activity?: boolean[];
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
  locale?: string;
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
            <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.growthPulse")}</p>
            <p className="mt-1 text-sm font-medium text-white">{summary}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            Gen {genLevel}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.currentMood")}</p>
            <p className="mt-1 text-sm text-white/82">{mood}</p>
          </div>
          <div className="rounded-lg bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.nextEvolution")}</p>
            <p className="mt-1 text-sm text-white/82">{evolutionHint}</p>
          </div>
          <div className="rounded-lg bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.newTraces")}</p>
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
            <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.recentPanel")}</p>
            <p className="mt-1 text-xs text-white/50">{t("home.recentPanelHint")}</p>
            <p className="mt-2 text-sm font-medium text-white">
              {newItemsSinceLastVisit.length > 0
                ? t("home.newTracesRecorded").replace("{count}", String(newItemsSinceLastVisit.length))
                : t("home.recentFallback")}
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            {t("home.recentCount").replace("{count}", String(recentItems.length))}
          </span>
        </button>

        {showRecentPanel && (
          <>
            <div className="mt-3 space-y-2">
              {(newItemsSinceLastVisit.length > 0 ? newItemsSinceLastVisit : recentItems.slice(0, 3)).map((item) => (
                <div key={`${item.kind}-${item.id}`} className="rounded-lg bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-white/55">{item.kind === "milestone" ? t("home.milestone") : t("home.activityLabel")}</p>
                    <p className="text-[11px] text-white/55">{formatDate(item.created_at)}</p>
                  </div>
                  <p className="mt-1 text-sm text-white/82">{item.title}</p>
                </div>
              ))}
              {recentItems.length === 0 && (
                <div className="rounded-lg bg-black/25 p-3 text-sm text-white/55">
                  {t("home.recentEmptyHint")}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/activity" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                {t("home.openRecentActivity")}
              </Link>
              <Link href="/album" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                {t("home.openAlbumAgain")}
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <button type="button" onClick={toggleGrowthPanel} className="flex w-full items-start justify-between gap-3 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.growthPanel")}</p>
            <p className="mt-1 text-xs text-white/50">{t("home.growthPanelHint")}</p>
            <p className="mt-2 text-sm font-medium text-white">{recap?.next_action ?? t("home.retentionFallback")}</p>
          </div>
          <span className={`rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${
            recap?.streak.days ? (recap.streak.days >= 7 ? "border-orange-500/50 bg-orange-500/20 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.2)]" : "border-orange-500/30 bg-orange-500/10 text-orange-200/90") : "border-white/15 bg-white/5 text-white/70"
          }`}>
            {recap?.streak.days ? "🔥 " : ""}{t("home.streakCount").replace("{count}", String(recap?.streak.days ?? 0))}
          </span>
        </button>

        {recap && (
          <div className="mt-3">
            <StreakDisplay
              days={recap.streak.days}
              todayActive={recap.streak.today_active}
              weeklyActivity={recap.streak.weekly_activity ?? []}
              compact
            />
          </div>
        )}

        {showGrowthPanel && (
          <>
            {recap?.premium_locked && (
              <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3">
                <p className="text-xs text-cyan-100/75">PRO RECAP</p>
                <p className="mt-1 text-sm text-cyan-50">
                  {t("home.proRecapBody")}
                </p>
                <Link href="/plans" className="mt-3 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15">
                  {t("home.seeUpgradePlans")}
                </Link>
              </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.today")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {t("home.todayStats").replace("{messages}", String(recap?.today.user_messages ?? 0)).replace("{activities}", String(recap?.today.activities ?? 0))}
                </p>
                <p className="mt-1 text-xs text-white/50">{recap?.streak.today_active ? t("home.todayDone") : t("home.todayEmpty")}</p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.thisWeek")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {t("home.weekStats").replace("{messages}", String(recap?.weekly.user_messages ?? 0)).replace("{milestones}", String(recap?.weekly.milestones ?? 0))}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {t("home.artifactsCount").replace("{count}", String(recap?.weekly.artifacts ?? 0))}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.weeklyHighlight")}</p>
                <p className="mt-1 text-sm text-white/82">{recap?.weekly.highlight ?? t("home.weeklyFallback")}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <button type="button" onClick={togglePlanningPanel} className="flex w-full items-start justify-between gap-3 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.planningPanel")}</p>
            <p className="mt-1 text-xs text-white/50">{t("home.planningPanelHint")}</p>
            <p className="mt-2 text-sm font-medium text-white">
              {recap?.goal_loop?.next_action ?? recap?.goal_loop?.active_goal ?? t("home.goalLoopSummaryEmpty")}
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            {t("home.tasksCount").replace("{count}", String(recap?.goal_loop?.pending_count ?? 0))}
          </span>
        </button>

        {showPlanningPanel && (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.currentGoalLabel")}</p>
                <p className="mt-1 text-sm text-white/82">{recap?.goal_loop?.active_goal ?? t("home.goalLoopCurrentEmpty")}</p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.longTermDirection")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {recap?.goal_loop?.long_term_goal ?? recap?.goal_loop?.active_goal ?? t("home.goalLoopCurrentEmpty")}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/60">{t("home.researchNext")}</p>
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

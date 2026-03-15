"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { WeeklyEventCard } from "@/components/weekly-event-card";
import { useChatStore } from "@/store/chat-store";

type DiscoverCounts = {
  activity: number;
  album: number;
  social: number;
  explore: number;
};

export default function DiscoverPage() {
  const { locale, t } = useTranslations();
  const weeklyEventProgress = useChatStore((s) => s.weeklyEventProgress);
  const [counts, setCounts] = useState<DiscoverCounts>({
    activity: 0,
    album: 0,
    social: 0,
    explore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [activityRes, albumRes, socialRes, exploreRes] = await Promise.all([
          fetch("/api/activity"),
          fetch("/api/album"),
          fetch("/api/social"),
          fetch("/api/explore"),
        ]);

        const [activityJson, albumJson, socialJson, exploreJson] = await Promise.all([
          activityRes.ok ? activityRes.json().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
          albumRes.ok ? albumRes.json().catch(() => ({ milestones: [] })) : Promise.resolve({ milestones: [] }),
          socialRes.ok
            ? socialRes.json().catch(() => ({ socialLogs: [], otherAgents: [] }))
            : Promise.resolve({ socialLogs: [], otherAgents: [] }),
          exploreRes.ok ? exploreRes.json().catch(() => ({ profiles: [] })) : Promise.resolve({ profiles: [] }),
        ]);

        if (!cancelled) {
          setCounts({
            activity: Array.isArray(activityJson.items) ? activityJson.items.length : 0,
            album: Array.isArray(albumJson.milestones) ? albumJson.milestones.length : 0,
            social:
              (Array.isArray(socialJson.socialLogs) ? socialJson.socialLogs.length : 0) +
              (Array.isArray(socialJson.otherAgents) ? socialJson.otherAgents.length : 0),
            explore: Array.isArray(exploreJson.profiles) ? exploreJson.profiles.length : 0,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        href: "/activity",
        count: counts.activity,
        title: t("activity.title"),
        body:
          locale === "en"
            ? "Review preserved activity, recent logs, and change history."
            : "보존된 활동, 최근 로그, 변화 기록을 다시 확인하세요.",
      },
      {
        href: "/album",
        count: counts.album,
        title: t("album.title"),
        body:
          locale === "en"
            ? "See milestones, manifestation changes, and long-term memory."
            : "마일스톤, 형상 변화, 장기 기억의 흐름을 살펴보세요.",
      },
      {
        href: "/social",
        count: counts.social,
        title: t("socialPage.title"),
        body:
          locale === "en"
            ? "Check encounters, social echoes, and relation signals."
            : "마주침, 소셜 잔향, 관계 신호를 확인하세요.",
      },
      {
        href: "/explore",
        count: counts.explore,
        title: t("explore.title"),
        body:
          locale === "en"
            ? "Browse the wider ecosystem and other living presences."
            : "넓은 생태계와 다른 존재들의 흐름을 둘러보세요.",
      },
    ],
    [counts.activity, counts.album, counts.social, counts.explore, locale, t],
  );

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="theme-panel rounded-[2rem] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)]">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            {locale === "en" ? "DISCOVER" : "DISCOVER"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {locale === "en" ? "One place for traces, growth, and ecosystem" : "흔적, 성장, 생태계를 한곳에서"}
          </h1>
          <p className="theme-text-subtle mt-3 max-w-3xl text-base leading-7">
            {locale === "en"
              ? "Home stays focused on chat. Discover now gathers the deeper surfaces that used to be spread across the navigation."
              : "홈은 이제 채팅에 집중합니다. Discover는 이전에 흩어져 있던 깊은 탐색 화면들을 한곳에 모아 보여줍니다."}
          </p>
        </header>

        <WeeklyEventCard locale={locale} progress={weeklyEventProgress} />

        <section className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="theme-panel block rounded-[1.75rem] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="theme-text-faint text-xs uppercase tracking-[0.2em]">
                    {loading
                      ? locale === "en"
                        ? "Loading"
                        : "불러오는 중"
                      : locale === "en"
                        ? `${card.count} items`
                        : `${card.count}개 항목`}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">{card.title}</h2>
                  <p className="theme-text-subtle mt-3 text-base leading-7">{card.body}</p>
                </div>
                <span className="theme-subpanel rounded-full px-3 py-2 text-sm theme-text-muted">
                  {locale === "en" ? "Open" : "열기"}
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section className="theme-panel rounded-[1.75rem] p-5">
          <p className="text-sm font-medium">
            {locale === "en" ? "More ways to explore" : "더 둘러볼 수 있는 곳"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/leaderboard"
              className="theme-subpanel inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-base theme-text-muted transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {t("leaderboard.title")}
            </Link>
            <Link
              href="/compare"
              className="theme-subpanel inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-base theme-text-muted transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {t("compare.title")}
            </Link>
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}

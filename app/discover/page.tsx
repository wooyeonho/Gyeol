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
        body: t("discover.activityBody"),
      },
      {
        href: "/album",
        count: counts.album,
        title: t("album.title"),
        body: t("discover.albumBody"),
      },
      {
        href: "/social",
        count: counts.social,
        title: t("socialPage.title"),
        body: t("discover.socialBody"),
      },
      {
        href: "/explore",
        count: counts.explore,
        title: t("explore.title"),
        body: t("discover.exploreBody"),
      },
    ],
    [counts.activity, counts.album, counts.social, counts.explore, locale, t],
  );

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="theme-panel rounded-[2rem] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)]">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            {t("discover.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {t("discover.title")}
          </h1>
          <p className="theme-text-subtle mt-3 max-w-3xl text-base leading-7">
            {t("discover.subtitle")}
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
                      ? t("discover.loading")
                      : t("discover.itemsCount").replace("{count}", String(card.count))}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">{card.title}</h2>
                  <p className="theme-text-subtle mt-3 text-base leading-7">{card.body}</p>
                </div>
                <span className="theme-subpanel rounded-full px-3 py-2 text-sm theme-text-muted">
                  {t("discover.open")}
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section className="theme-panel rounded-[1.75rem] p-5">
          <p className="text-sm font-medium">
            {t("discover.moreWays")}
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

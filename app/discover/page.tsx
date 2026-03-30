"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { WeeklyEventCard } from "@/components/weekly-event-card";
import { useChatStore } from "@/store/chat-store";
import { haptic } from "@/lib/micro-interactions";
import { initOrRefreshDailyChallenges } from "@/lib/engagement/daily-challenge";

function CardIcon({ type }: { type: string }) {
  const cls = "h-8 w-8";
  switch (type) {
    case "activity":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h4l3-9 4 18 3-9h4" />
        </svg>
      );
    case "album":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 4v16" />
          <path d="M12 8c1 1.3 2 2 3 2s2-.7 3-2" />
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="9" r="3" />
          <circle cx="16" cy="9" r="3" />
          <path d="M3 20c1-3 3-5 5-5s4 2 5 5" opacity=".6" />
          <path d="M11 20c1-3 3-5 5-5s4 2 5 5" opacity=".6" />
        </svg>
      );
    case "explore":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="m10 14 5-5-2 6-6 2 3-3Z" />
        </svg>
      );
    case "room":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5Z" />
          <path d="M9 21V14h6v7" />
        </svg>
      );
    case "constellation":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
          <path d="M12 6.5L6 10.5M12 6.5l6 4M6 13.5l3 4M18 13.5l-2 3.5M9.5 18.5l5.5-1" opacity=".5" />
        </svg>
      );
    default:
      return null;
  }
}

const CARD_GRADIENTS = [
  "from-cyan-500/20 to-blue-500/5",
  "from-purple-500/20 to-fuchsia-500/5",
  "from-amber-500/20 to-orange-500/5",
  "from-emerald-500/20 to-teal-500/5",
  "from-indigo-500/20 to-violet-500/5",
  "from-rose-500/20 to-pink-500/5",
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

type DiscoverCounts = {
  activity: number;
  album: number;
  social: number;
  explore: number;
  room: number;
  constellation: number;
};

export default function DiscoverPage() {
  const { locale, t } = useTranslations();
  const weeklyEventProgress = useChatStore((s) => s.weeklyEventProgress);
  const [counts, setCounts] = useState<DiscoverCounts>({
    activity: 0,
    album: 0,
    social: 0,
    explore: 0,
    room: 0,
    constellation: 0,
  });
  const [loading, setLoading] = useState(true);
  const [challengeCompleted, setChallengeCompleted] = useState(0);
  const challengeTotal = 3;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = initOrRefreshDailyChallenges();
    setChallengeCompleted(state.challenges.filter((c) => c.completed).length);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [activityRes, albumRes, socialRes, exploreRes, roomRes, constellationRes] = await Promise.all([
          fetch("/api/activity"),
          fetch("/api/album"),
          fetch("/api/social"),
          fetch("/api/explore"),
          fetch("/api/room"),
          fetch("/api/constellation"),
        ]);

        const [activityJson, albumJson, socialJson, exploreJson, roomJson, constellationJson] = await Promise.all([
          activityRes.ok ? activityRes.json().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
          albumRes.ok ? albumRes.json().catch(() => ({ milestones: [] })) : Promise.resolve({ milestones: [] }),
          socialRes.ok
            ? socialRes.json().catch(() => ({ socialLogs: [], socialPosts: [], otherAgents: [] }))
            : Promise.resolve({ socialLogs: [], socialPosts: [], otherAgents: [] }),
          exploreRes.ok ? exploreRes.json().catch(() => ({ profiles: [] })) : Promise.resolve({ profiles: [] }),
          roomRes.ok ? roomRes.json().catch(() => ({ objects: [] })) : Promise.resolve({ objects: [] }),
          constellationRes.ok ? constellationRes.json().catch(() => ({ stars: [] })) : Promise.resolve({ stars: [] }),
        ]);

        if (!cancelled) {
          setCounts({
            activity: Array.isArray(activityJson.items) ? activityJson.items.length : 0,
            album: Array.isArray(albumJson.milestones) ? albumJson.milestones.length : 0,
            social:
              (Array.isArray(socialJson.socialLogs) ? socialJson.socialLogs.length : 0) +
              (Array.isArray(socialJson.socialPosts) ? socialJson.socialPosts.length : 0) +
              (Array.isArray(socialJson.otherAgents) ? socialJson.otherAgents.length : 0),
            explore: Array.isArray(exploreJson.profiles) ? exploreJson.profiles.length : 0,
            room: Array.isArray(roomJson.objects) ? roomJson.objects.length : 0,
            constellation: Array.isArray(constellationJson.stars) ? constellationJson.stars.length : 0,
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
        iconType: "activity",
        gradient: CARD_GRADIENTS[0],
      },
      {
        href: "/album",
        count: counts.album,
        title: t("album.title"),
        body: t("discover.albumBody"),
        iconType: "album",
        gradient: CARD_GRADIENTS[1],
      },
      {
        href: "/social",
        count: counts.social,
        title: t("socialPage.title"),
        body: t("discover.socialBody"),
        iconType: "social",
        gradient: CARD_GRADIENTS[2],
      },
      {
        href: "/explore",
        count: counts.explore,
        title: t("explore.title"),
        body: t("discover.exploreBody"),
        iconType: "explore",
        gradient: CARD_GRADIENTS[3],
      },
      {
        href: "/room",
        count: counts.room,
        title: t("roomPage.title"),
        body: t("discover.roomBody"),
        iconType: "room",
        gradient: CARD_GRADIENTS[4],
      },
      {
        href: "/constellation",
        count: counts.constellation,
        title: t("constellationPage.title"),
        body: t("discover.constellationBody"),
        iconType: "constellation",
        gradient: CARD_GRADIENTS[5],
      },
    ],
    [counts.activity, counts.album, counts.social, counts.explore, counts.room, counts.constellation, t],
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

        {/* Daily Challenge progress bar */}
        <Link href="/challenges" onClick={() => haptic("tap")} className="block rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span className="text-sm font-medium text-white/80">
                {t("discover.dailyChallenges") || "오늘의 챌린지"}
              </span>
            </div>
            <span className="text-xs text-white/40">{challengeCompleted}/{challengeTotal}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"
              initial={{ width: "0%" }}
              animate={{ width: `${(challengeCompleted / challengeTotal) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          {challengeCompleted === challengeTotal && (
            <p className="mt-1.5 text-xs text-amber-300/80">
              {t("discover.perfectDay") || "완벽한 하루! 보상을 받을 수 있어요 🎁"}
            </p>
          )}
        </Link>

        {/* Section label */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            {t("discover.eyebrow")}
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* 2×3 Bento Grid */}
        <motion.section
          className="grid grid-cols-2 gap-3"
          initial="hidden"
          animate="visible"
        >
          {cards.map((card, i) => (
            <motion.div key={card.href} custom={i} variants={cardVariants}>
              <Link
                href={card.href}
                onClick={() => haptic("tap")}
                className={`group relative flex flex-col overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${card.gradient} p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[130px]`}
              >
                <div className="absolute inset-0 rounded-[1.5rem] border border-white/10 group-hover:border-white/20 transition-colors" />
                <div className="rounded-xl bg-white/8 p-2 text-white/70 group-hover:text-white/90 transition-colors w-fit mb-2">
                  <CardIcon type={card.iconType} />
                </div>
                <h2 className="text-sm font-semibold tracking-tight text-white leading-tight">{card.title}</h2>
                <p className="theme-text-faint text-xs mt-0.5">
                  {loading ? (
                    <span className="inline-block h-3 w-10 animate-pulse rounded bg-white/10" />
                  ) : (
                    t("discover.itemsCount").replace("{count}", String(card.count))
                  )}
                </p>
                <p className="theme-text-subtle mt-auto pt-2 text-xs leading-5 line-clamp-2">{card.body}</p>
              </Link>
            </motion.div>
          ))}
        </motion.section>

        {!loading && counts.activity === 0 && counts.album === 0 && counts.social === 0 && counts.explore === 0 && counts.room === 0 && counts.constellation === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5 text-center"
          >
            <p className="text-sm text-white/50 leading-relaxed">
              {t("discover.allEmpty")}
            </p>
          </motion.div>
        )}

        {/* More Ways divider */}
        <div className="flex items-center gap-2 px-1 pt-2">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            {t("discover.moreWays")}
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <section className="grid grid-cols-3 gap-2">
          {[
            { href: "/leaderboard", label: t("leaderboard.title"), icon: "🏆" },
            { href: "/compare", label: t("compare.title"), icon: "⚔️" },
            { href: "/time-travel", label: t("timeTravel.title"), icon: "⏳" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptic("tap")}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-4 text-center transition-all hover:bg-white/[0.06] hover:border-white/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium text-white/70">{item.label}</span>
            </Link>
          ))}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}

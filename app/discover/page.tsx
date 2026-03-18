"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { WeeklyEventCard } from "@/components/weekly-event-card";
import { useChatStore } from "@/store/chat-store";
import { haptic } from "@/lib/micro-interactions";

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
    default:
      return null;
  }
}

const CARD_GRADIENTS = [
  "from-cyan-500/20 to-blue-500/5",
  "from-purple-500/20 to-fuchsia-500/5",
  "from-amber-500/20 to-orange-500/5",
  "from-emerald-500/20 to-teal-500/5",
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
            ? socialRes.json().catch(() => ({ socialLogs: [], socialPosts: [], otherAgents: [] }))
            : Promise.resolve({ socialLogs: [], socialPosts: [], otherAgents: [] }),
          exploreRes.ok ? exploreRes.json().catch(() => ({ profiles: [] })) : Promise.resolve({ profiles: [] }),
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
    ],
    [counts.activity, counts.album, counts.social, counts.explore, t],
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

        <motion.section
          className="grid gap-4 md:grid-cols-2"
          initial="hidden"
          animate="visible"
        >
          {cards.map((card, i) => (
            <motion.div key={card.href} custom={i} variants={cardVariants}>
              <Link
                href={card.href}
                onClick={() => haptic("tap")}
                className={`group relative block overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${card.gradient} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
              >
                {/* Gradient border accent */}
                <div className="absolute inset-0 rounded-[1.75rem] border border-white/10 group-hover:border-white/20 transition-colors" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/8 p-2 text-white/70 group-hover:text-white/90 transition-colors">
                        <CardIcon type={card.iconType} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-white">{card.title}</h2>
                        <p className="theme-text-faint text-xs">
                          {loading ? (
                            <span className="inline-block h-3 w-16 animate-pulse rounded bg-white/10" />
                          ) : (
                            t("discover.itemsCount").replace("{count}", String(card.count))
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="theme-text-subtle mt-3 text-sm leading-6">{card.body}</p>
                  </div>
                  <span className="mt-1 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/60 group-hover:bg-white/12 group-hover:text-white/80 transition-all">
                    {t("discover.open")}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.section>

        {!loading && counts.activity === 0 && counts.album === 0 && counts.social === 0 && counts.explore === 0 && (
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

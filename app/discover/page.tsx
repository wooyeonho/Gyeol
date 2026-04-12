"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { WeeklyEventCard } from "@/components/weekly-event-card";
import { useChatStore } from "@/store/chat-store";
import { haptic } from "@/lib/micro-interactions";
import { initOrRefreshDailyChallenges } from "@/lib/engagement/daily-challenge";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { PageShell, itemVariants } from "@/components/discover/page-shell";
import { DiscoverGridSkeleton } from "@/components/discover/skeleton";
import { useAgentStore } from "@/store/agent-store";
import dynamic from "next/dynamic";
import type { CreatureDNA } from "@/lib/genome/dna";
import { getAvailableEvents, makeChoice, type StoryEvent } from "@/lib/game/narrative-system";
import type { PartyMember, SynergyBonus } from "@/lib/game/party-system";
import { calculatePartySynergy } from "@/lib/game/party-system";

const DailySpecialChallenge = dynamic(() => import("@/components/daily-special-challenge").then(m => m.DailySpecialChallenge), { ssr: false });
const DungeonExplorer = dynamic(() => import("@/components/dungeon-explorer").then(m => m.DungeonExplorer), { ssr: false });
const PvPRankCard = dynamic(() => import("@/components/pvp-rank-card").then(m => m.PvPRankCard), { ssr: false });
const SpeciesCodex = dynamic(() => import("@/components/species-codex").then(m => ({ default: m.SpeciesCodex })), { ssr: false });
const NarrativeEventCard = dynamic(() => import("@/components/narrative-event-card").then(m => ({ default: m.NarrativeEventCard })), { ssr: false });
const BattlePass = dynamic(() => import("@/components/battle-pass"), { ssr: false });
const LeagueBadge = dynamic(() => import("@/components/league-badge"), { ssr: false });
const PartyPanel = dynamic(() => import("@/components/party-panel").then(m => ({ default: m.PartyPanel })), { ssr: false });
const DiscoverCreatureSections = dynamic(() => import("@/components/discover/creature-sections").then(m => ({ default: m.DiscoverCreatureSections })), {
  ssr: false,
  loading: () => <div className="h-40 rounded-2xl bg-white/[0.04] animate-pulse" />,
});
const ForYouStrip = dynamic(() => import("@/components/discover/for-you-strip").then(m => ({ default: m.ForYouStrip })), {
  ssr: false,
  loading: () => <div className="h-28 rounded-2xl bg-white/[0.03] animate-pulse" />,
});

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
  "from-cyan-500/30 to-blue-500/10",
  "from-purple-500/30 to-fuchsia-500/10",
  "from-amber-500/30 to-orange-500/10",
  "from-emerald-500/30 to-teal-500/10",
  "from-indigo-500/30 to-violet-500/10",
  "from-rose-500/30 to-pink-500/10",
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
  const agentState = useAgentStore((s) => s.agentState);
  const dna = (agentState?.genome as unknown as { dna?: CreatureDNA } | null)?.dna ?? null;
  const genLevel = (agentState?.gen_level as number) ?? 1;
  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const streakDays = typeof agentState?.streak_days === "number" ? agentState.streak_days : 0;
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const isSilentCreature = (dna?.verbal ?? 0.5) < 0.15;
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

  // Party system — placeholder data (will be replaced with real data from store)
  const placeholderParty = useMemo<PartyMember[]>(() => {
    if (!dna) return [];
    return [
      {
        creatureId: "active-creature",
        name: agentState?.self_name ?? "결",
        dominantType: "analytical",
        level: genLevel,
        stats: { hp: 45, atk: 38, def: 32, spd: 40, wis: 50, cha: 35 },
        isActive: true,
        affinity: agentState?.intimacy_score ?? 0.5,
      },
    ];
  }, [dna, agentState, genLevel]);
  const partySynergies = useMemo(() => calculatePartySynergy(placeholderParty), [placeholderParty]);

  // Narrative branching events
  const [narrativeEvent, setNarrativeEvent] = useState<StoryEvent | null>(null);
  const [narrativeOutcome, setNarrativeOutcome] = useState<string | null>(null);

  useEffect(() => {
    const timeOfDay = (() => {
      const h = new Date().getHours();
      if (h < 6) return "night";
      if (h < 12) return "morning";
      if (h < 18) return "afternoon";
      return "evening";
    })();
    const available = getAvailableEvents({
      totalMessages: (agentState?.total_messages as number) ?? 0,
      affinity: agentState?.intimacy_score ?? 0,
      genLevel,
      timeOfDay,
    });
    if (available.length > 0) {
      setNarrativeEvent(available[0]);
    }
  }, [agentState, genLevel]);

  const handleNarrativeChoice = (choiceId: string) => {
    if (!narrativeEvent) return;
    const isKo = locale === "ko";
    const result = makeChoice(narrativeEvent.id, choiceId);
    if (result) {
      setNarrativeOutcome(isKo ? result.outcome.ko : result.outcome.en);
    }
  };

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

  if (loading) return <DiscoverGridSkeleton />;

  return (
    <PageShell>
        <motion.div variants={itemVariants}>
        <DiscoverPageHeader
          eyebrow={t("discover.eyebrow")}
          title={t("discover.title")}
          subtitle={t("discover.subtitle")}
        />
        </motion.div>

        {/* Personalized For-You rail — ranks actionable tiles from live agent state
            (DNA, streak, vitality, memory, challenge progress) so the interest
            graph isn't hidden behind three scrolls. */}
        <motion.div variants={itemVariants}>
          <ForYouStrip
            dna={dna}
            totalMessages={totalMessages}
            streakDays={streakDays}
            genLevel={genLevel}
            challengeCompleted={challengeCompleted}
            challengeTotal={challengeTotal}
            vitality={vitality}
            isSilent={isSilentCreature}
          />
        </motion.div>

        {/* Quick-access story feed — horizontal scroll (Instagram Explore inspired) */}
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-white/80">{t("discover.storiesTitle") || "Stories"}</h2>
            <Link href="/feed" className="text-xs text-cyan-400/70 hover:text-cyan-300">{t("discover.feedTitle") || "Feed"} →</Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {[
              { emoji: "📖", label: locale === "ko" ? "일기" : "Diary", href: "/diary", gradient: "from-purple-500/25 to-fuchsia-500/10" },
              { emoji: "🧬", label: locale === "ko" ? "진화 기록" : "Evolution", href: "/activity", gradient: "from-cyan-500/25 to-blue-500/10" },
              { emoji: "🏆", label: locale === "ko" ? "업적" : "Achievements", href: "/challenges", gradient: "from-amber-500/25 to-orange-500/10" },
              { emoji: "💬", label: locale === "ko" ? "커뮤니티" : "Community", href: "/community/spaces", gradient: "from-emerald-500/25 to-teal-500/10" },
              { emoji: "🎁", label: locale === "ko" ? "연간 요약" : "Wrapped", href: "/wrapped", gradient: "from-rose-500/25 to-pink-500/10" },
            ].map((story) => (
              <Link
                key={story.href}
                href={story.href}
                onClick={() => haptic("tap")}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-gradient-to-br ${story.gradient} px-4 py-3 transition-all hover:border-white/20 active:scale-95`}
                style={{ width: 80 }}
              >
                <span className="text-2xl">{story.emoji}</span>
                <span className="text-[10px] font-medium text-white/70 text-center leading-tight">{story.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        <WeeklyEventCard locale={locale} progress={weeklyEventProgress} />

        {/* Daily Special Challenges — procedural quests */}
        {dna ? (
          <DailySpecialChallenge dna={dna} genLevel={genLevel} locale={locale} />
        ) : (
          <Link href="/challenges" onClick={() => haptic("tap")} className="block glass-card rounded-2xl p-4 hover:brightness-110 transition-all btn-3d">
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
        )}

        {/* Party panel — creature team management */}
        {placeholderParty.length > 0 && (
          <PartyPanel
            party={placeholderParty}
            synergies={partySynergies}
            onSwitchActive={(id) => { haptic("tap"); }}
            onAddCreature={() => { haptic("tap"); }}
            compact={false}
          />
        )}

        {/* Battle Pass — season rewards track */}
        <BattlePass />

        {/* Narrative branching story event */}
        {narrativeEvent && (
          <NarrativeEventCard
            event={{
              id: narrativeEvent.id,
              title: locale === "ko" ? narrativeEvent.title.ko : narrativeEvent.title.en,
              description: locale === "ko" ? narrativeEvent.description.ko : narrativeEvent.description.en,
              choices: narrativeEvent.choices.map((c) => ({
                id: c.id,
                text: locale === "ko" ? c.label.ko : c.label.en,
                hint: c.dnaEffects.slice(0, 2).map((e) => `${e.axis} ${e.delta > 0 ? "+" : ""}${(e.delta * 100).toFixed(0)}%`).join(", "),
              })),
            }}
            onChoose={handleNarrativeChoice}
            outcome={narrativeOutcome}
            compact
          />
        )}

        {/* Creature sections — Similar DNA / Popular / New */}
        <DiscoverCreatureSections />

        {/* Section label */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-white/[0.12]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            {t("discover.eyebrow")}
          </span>
          <div className="h-px flex-1 bg-white/[0.12]" />
        </div>

        {/* Bento Grid — Instagram Explore feel: one large hero + five compacts */}
        <motion.section
          className="grid grid-cols-2 grid-rows-[auto_auto_auto] gap-3"
          initial="hidden"
          animate="visible"
        >
          {cards.map((card, i) => {
            const isHero = i === 0; // first card spans both columns as a feature tile
            return (
              <motion.div
                key={card.href}
                custom={i}
                variants={cardVariants}
                className={isHero ? "col-span-2" : ""}
              >
                <Link
                  href={card.href}
                  onClick={() => haptic("tap")}
                  className={`group relative flex ${isHero ? "flex-row items-center gap-4" : "flex-col"} overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br ${card.gradient} p-4 transition-all duration-300 hover:-translate-y-[2px] hover:border-white/[0.18] hover:shadow-xl hover:shadow-black/40 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${isHero ? "min-h-[112px]" : "min-h-[134px]"}`}
                >
                  {/* Ambient glow orb for depth */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"
                    style={{ background: "white" }}
                  />

                  <div className={`rounded-xl bg-white/[0.08] p-2.5 text-white/80 transition-all duration-300 group-hover:bg-white/[0.14] group-hover:text-white ${isHero ? "flex-shrink-0" : "mb-2 w-fit"}`}>
                    <CardIcon type={card.iconType} />
                  </div>

                  <div className={`${isHero ? "flex-1 min-w-0" : "flex flex-1 flex-col"}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className={`font-semibold tracking-tight text-white leading-tight ${isHero ? "text-base" : "text-sm"}`}>
                        {card.title}
                      </h2>
                      {card.count > 0 && (
                        <span className="shrink-0 rounded-full bg-white/[0.1] px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/80">
                          {card.count}
                        </span>
                      )}
                    </div>
                    <p className={`text-white/55 leading-snug ${isHero ? "mt-1 text-xs line-clamp-2" : "mt-auto pt-2 text-xs line-clamp-2"}`}>
                      {card.body}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.section>

        {counts.activity === 0 && counts.album === 0 && counts.social === 0 && counts.explore === 0 && counts.room === 0 && counts.constellation === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 glass-card rounded-2xl p-5 text-center"
          >
            <p className="text-sm text-white/50 leading-relaxed">
              {t("discover.allEmpty")}
            </p>
          </motion.div>
        )}

        {/* Dungeon & Encounters */}
        {dna && <DungeonExplorer locale={locale} />}

        {/* PvP Ranking */}
        {dna && <PvPRankCard locale={locale} />}

        {/* League Badge — ladder ranking */}
        <LeagueBadge mode="full" locale={locale === "ko" ? "ko" : "en"} />

        {/* Species Codex — Pokedex-style collection */}
        <SpeciesCodex locale={locale} />

        {/* More Ways divider */}
        <div className="flex items-center gap-2 px-1 pt-2">
          <div className="h-px flex-1 bg-white/[0.12]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            {t("discover.moreWays")}
          </span>
          <div className="h-px flex-1 bg-white/[0.12]" />
        </div>

        {(() => {
          const isKo = locale === "ko";
          const categories: {
            key: string;
            title: string;
            items: { href: string; label: string; icon: string }[];
          }[] = [
            {
              key: "growth",
              title: isKo ? "성장" : "Growth",
              items: [
                { href: "/dna",          label: isKo ? "DNA"          : "DNA",          icon: "🧬" },
                { href: "/dna-edit",     label: isKo ? "DNA 편집"     : "DNA Edit",     icon: "✂️" },
                { href: "/journey",      label: isKo ? "여정"         : "Journey",      icon: "🛤️" },
                { href: "/memories",     label: isKo ? "기억"         : "Memories",     icon: "💭" },
                { href: "/dashboard",    label: isKo ? "대시보드"     : "Dashboard",    icon: "📊" },
                { href: "/achievements", label: isKo ? "업적"         : "Achievements", icon: "🏅" },
                { href: "/wrapped",      label: isKo ? "연간 요약"    : "Wrapped",      icon: "🎁" },
                { href: "/leaderboard",  label: isKo ? "리더보드"     : "Leaderboard",  icon: "🏆" },
              ],
            },
            {
              key: "play",
              title: isKo ? "놀이" : "Play",
              items: [
                { href: "/gacha",        label: isKo ? "가챠"         : "Gacha",        icon: "🎰" },
                { href: "/breeding",     label: isKo ? "교배"         : "Breeding",     icon: "💞" },
                { href: "/adopt",        label: isKo ? "입양"         : "Adopt",        icon: "🤲" },
                { href: "/quiz",         label: isKo ? "퀴즈"         : "Quiz",         icon: "❓" },
                { href: "/events",       label: isKo ? "이벤트"       : "Events",       icon: "🎪" },
                { href: "/world-events", label: isKo ? "세계 이벤트"  : "World Events", icon: "🌍" },
                { href: "/time-travel",  label: isKo ? "시간여행"     : "Time Travel",  icon: "⏳" },
                { href: "/compare",      label: isKo ? "비교"         : "Compare",      icon: "⚔️" },
              ],
            },
            {
              key: "together",
              title: isKo ? "함께" : "Together",
              items: [
                { href: "/feed",               label: isKo ? "피드"         : "Feed",      icon: "📰" },
                { href: "/community/spaces",   label: isKo ? "스페이스"     : "Spaces",    icon: "🌐" },
                { href: "/community/species",  label: isKo ? "종족"         : "Species",   icon: "🐾" },
                { href: "/invites",            label: isKo ? "친구 초대"    : "Invites",   icon: "💌" },
              ],
            },
            {
              key: "care",
              title: isKo ? "돌봄" : "Care",
              items: [
                { href: "/diary",      label: isKo ? "일기"       : "Diary",      icon: "📓" },
                { href: "/wellness",   label: isKo ? "웰니스"     : "Wellness",   icon: "💚" },
                { href: "/care",       label: isKo ? "돌봄 기록"  : "Care Log",   icon: "🌱" },
                { href: "/emotion",    label: isKo ? "감정"       : "Emotion",    icon: "🪷" },
                { href: "/challenges", label: isKo ? "챌린지"     : "Challenges", icon: "⚡" },
                { href: "/crisis",     label: isKo ? "위기 지원"  : "Crisis",     icon: "🛟" },
              ],
            },
            {
              key: "create",
              title: isKo ? "만들기" : "Create",
              items: [
                { href: "/generate",             label: isKo ? "생성"        : "Generate", icon: "✨" },
                { href: "/ar",                   label: isKo ? "AR 뷰어"     : "AR View",  icon: "📱" },
                { href: "/creature-conversation",label: isKo ? "존재 대화"   : "Creature", icon: "🗣️" },
                { href: "/market",               label: isKo ? "상점"        : "Market",   icon: "🛍️" },
                { href: "/moltbook",             label: isKo ? "탈피 도감"   : "Moltbook", icon: "📖" },
                { href: "/molthub",              label: isKo ? "탈피 허브"   : "Molthub",  icon: "🪶" },
              ],
            },
            {
              key: "account",
              title: isKo ? "계정" : "Account",
              items: [
                { href: "/profile/customize", label: isKo ? "프로필 꾸미기" : "Profile",  icon: "✨" },
                { href: "/settings/security", label: isKo ? "보안 센터"     : "Security", icon: "🛡️" },
                { href: "/plans",             label: isKo ? "플랜"          : "Plans",    icon: "💎" },
                { href: "/features",          label: isKo ? "기능 소개"     : "Features", icon: "📋" },
              ],
            },
          ];

          return (
            <div className="flex flex-col gap-4">
              {categories.map((cat) => (
                <section key={cat.key} className="flex flex-col gap-2">
                  <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    {cat.title}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {cat.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => haptic("tap")}
                        className="glass-card btn-3d flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-center transition-all hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-xs font-medium text-white/70 leading-tight">
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          );
        })()}
    </PageShell>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";
import type { CreatureDNA } from "@/lib/genome/dna";

/**
 * Instagram Stories × TikTok For You strip — a horizontal, personalized
 * rail at the top of Discover that ranks actionable suggestions based on
 * live agent state (DNA axes, total messages, streak, challenges, etc.)
 * so the interest-graph isn't buried.
 *
 * Tiles are ranked by an urgency score and tap into real routes we
 * already ship. Rings adopt the creature's palette for a Stories feel.
 */

type Tile = {
  key: string;
  href: string;
  label: string;
  hint: string;
  icon: string;
  tone: [string, string]; // gradient ring stops
  score: number;          // higher = more urgent, shown first
};

export function ForYouStrip({
  accentColor,
  dna,
  totalMessages,
  streakDays,
  genLevel,
  challengeCompleted,
  challengeTotal,
  vitality,
  isSilent,
}: {
  accentColor?: string;
  dna: CreatureDNA | null;
  totalMessages: number;
  streakDays: number;
  genLevel: number;
  challengeCompleted: number;
  challengeTotal: number;
  vitality: number;
  isSilent: boolean;
}) {
  const { locale, t } = useTranslations();
  const isKo = locale.startsWith("ko");
  const accent = accentColor ?? "#9db8ff";

  // Top DNA axis (ignoring group balance) — used to steer "For You" copy.
  const topAxis = dna
    ? (Object.entries(dna) as Array<[string, number]>).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;

  const tiles: Tile[] = [];

  // --- Urgency: low vitality needs rescue (TinyRoommate care loop)
  if (vitality < 0.4) {
    tiles.push({
      key: "vitality",
      href: "/",
      label: isKo ? "온기 회복" : "Revive warmth",
      hint: isKo ? "대화로 생기를 돌려줘요" : "A chat restores vitality",
      icon: "💧",
      tone: ["#f472b6", "#fb7185"],
      score: 100,
    });
  }

  // --- Streak momentum (Duolingo loop) — nudge if inactive today
  if (streakDays > 0 && streakDays < 7) {
    tiles.push({
      key: "streak",
      href: "/achievements",
      label: isKo ? `${streakDays}일째 연속` : `${streakDays}-day streak`,
      hint: isKo ? "오늘도 이어가기" : "Keep it alive today",
      icon: "🔥",
      tone: ["#fbbf24", "#f97316"],
      score: 80 + streakDays,
    });
  }

  // --- Daily challenge progress (quest loop)
  if (challengeCompleted < challengeTotal) {
    tiles.push({
      key: "challenge",
      href: "/challenges",
      label: isKo ? "오늘의 챌린지" : "Today's challenge",
      hint: isKo
        ? `${challengeCompleted}/${challengeTotal} 완료`
        : `${challengeCompleted}/${challengeTotal} done`,
      icon: "⚡",
      tone: ["#22d3ee", "#6366f1"],
      score: 75 - challengeCompleted * 10,
    });
  }

  // --- Memory recall (Nomi loop) — surface once memory store is meaningful
  if (totalMessages >= 20) {
    tiles.push({
      key: "memory",
      href: "/memories",
      label: isKo ? "기억 되돌아보기" : "Look back",
      hint: isKo
        ? `${totalMessages.toLocaleString()}개의 조각`
        : `${totalMessages.toLocaleString()} moments`,
      icon: "💭",
      tone: ["#a78bfa", "#22d3ee"],
      score: 60,
    });
  }

  // --- DNA axis nudge (TikTok interest graph) — reflect dominant trait
  if (topAxis) {
    const axisLabels: Record<string, { ko: string; en: string }> = {
      analytical: { ko: "분석력", en: "analytical" },
      intuitive: { ko: "직관", en: "intuition" },
      verbal: { ko: "언어", en: "verbal" },
      spatial: { ko: "공간지각", en: "spatial" },
      warmth: { ko: "따뜻함", en: "warmth" },
      intensity: { ko: "강렬함", en: "intensity" },
      stability: { ko: "안정", en: "stability" },
      openness: { ko: "개방성", en: "openness" },
      assertiveness: { ko: "주장", en: "assertiveness" },
      empathy: { ko: "공감", en: "empathy" },
      playfulness: { ko: "장난기", en: "playfulness" },
      independence: { ko: "자립", en: "independence" },
      curiosity: { ko: "호기심", en: "curiosity" },
      persistence: { ko: "끈기", en: "persistence" },
      adaptability: { ko: "적응력", en: "adaptability" },
      creativity: { ko: "창의성", en: "creativity" },
    };
    const label = axisLabels[topAxis] ?? { ko: topAxis, en: topAxis };
    tiles.push({
      key: "dna-axis",
      href: "/dna",
      label: isKo ? `${label.ko}이 강해요` : `${label.en} is rising`,
      hint: isKo ? "DNA 그래프 보기" : "See the DNA map",
      icon: "🧬",
      tone: ["#34d399", "#22d3ee"],
      score: 55,
    });
  }

  // --- Gen level pride — always-on when high
  if (genLevel >= 3) {
    tiles.push({
      key: "gen",
      href: "/wrapped",
      label: isKo ? `Gen ${genLevel} 여정` : `Gen ${genLevel} journey`,
      hint: isKo ? "연간 요약 열기" : "Open the wrapped story",
      icon: "✨",
      tone: ["#c084fc", "#f472b6"],
      score: 40 + genLevel,
    });
  }

  // --- Silent mode (verbal < 0.15) → explain touch interaction
  if (isSilent) {
    tiles.push({
      key: "silent",
      href: "/",
      label: isKo ? "말 없는 교감" : "Silent bond",
      hint: isKo ? "터치로 대화하기" : "Touch to connect",
      icon: "🤫",
      tone: ["#94a3b8", "#64748b"],
      score: 50,
    });
  }

  // --- Always-on fallback: Discover sub-feeds
  if (tiles.length < 3) {
    tiles.push({
      key: "explore",
      href: "/explore",
      label: isKo ? "다른 생명체 만나기" : "Meet others",
      hint: isKo ? "비슷한 친구 찾기" : "Find kindred",
      icon: "🌱",
      tone: ["#22d3ee", "#34d399"],
      score: 20,
    });
  }

  const ordered = tiles.sort((a, b) => b.score - a.score).slice(0, 6);

  if (ordered.length === 0) return null;

  return (
    <div className="-mx-4 px-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          {t("discover.forYouLabel")}
        </span>
        <span className="text-[10px] text-white/30">
          {t("discover.forYouHint")}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 pr-4 scrollbar-none snap-x snap-mandatory">
        {ordered.map((tile, i) => (
          <motion.div
            key={tile.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="snap-start"
          >
            <Link
              href={tile.href}
              onClick={() => haptic("tap")}
              className="group flex w-[128px] shrink-0 flex-col items-center gap-2 focus-visible:outline-none"
              aria-label={`${tile.label} — ${tile.hint}`}
            >
              {/* Instagram-stories style gradient ring */}
              <div
                className="rounded-full p-[2px] transition-transform duration-300 group-hover:scale-[1.04] group-active:scale-[0.96]"
                style={{
                  background: `conic-gradient(from 120deg, ${tile.tone[0]}, ${tile.tone[1]}, ${accent}, ${tile.tone[0]})`,
                }}
              >
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/10 bg-black/70 text-2xl backdrop-blur-md"
                  style={{ boxShadow: `0 10px 24px -16px ${tile.tone[1]}90` }}
                >
                  <span aria-hidden="true">{tile.icon}</span>
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="line-clamp-1 text-[11px] font-semibold text-white/90">
                  {tile.label}
                </span>
                <span className="line-clamp-1 text-[10px] text-white/45">
                  {tile.hint}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

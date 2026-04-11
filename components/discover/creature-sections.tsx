"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";

type CreatureCard = {
  id: string;
  self_name: string | null;
  gen_level: number;
  vitality: number;
  total_messages: number;
  memory_count: number;
  species: string | null;
  dna_similarity?: number | null;
  visual: unknown;
  created_at: string | null;
};

type Sections = {
  similar_dna: CreatureCard[];
  popular: CreatureCard[];
  new: CreatureCard[];
};

const COPY: Record<
  string,
  { similar: string; similarHint: string; popular: string; popularHint: string; fresh: string; freshHint: string; level: string; messages: string; match: string; empty: string }
> = {
  ko: {
    similar: "비슷한 DNA",
    similarHint: "내 생명체와 닮은 친구들",
    popular: "인기",
    popularHint: "지금 가장 활발한 생명체",
    fresh: "새로운",
    freshHint: "최근 태어난 생명체",
    level: "Lv",
    messages: "대화",
    match: "일치",
    empty: "아직 찾을 친구가 없어요",
  },
  en: {
    similar: "Similar DNA",
    similarHint: "Creatures that match your vibe",
    popular: "Popular",
    popularHint: "Most active right now",
    fresh: "New",
    freshHint: "Recently hatched",
    level: "Lv",
    messages: "msgs",
    match: "match",
    empty: "No creatures to explore yet",
  },
  ja: {
    similar: "似たDNA",
    similarHint: "君の生き物に似た仲間",
    popular: "人気",
    popularHint: "今最も活発",
    fresh: "新着",
    freshHint: "最近誕生",
    level: "Lv",
    messages: "会話",
    match: "一致",
    empty: "まだ仲間がいません",
  },
  zh: {
    similar: "相似 DNA",
    similarHint: "与你的生命体相似的朋友",
    popular: "人气",
    popularHint: "最活跃的",
    fresh: "新来",
    freshHint: "最近诞生",
    level: "Lv",
    messages: "对话",
    match: "匹配",
    empty: "暂无生命体",
  },
  es: {
    similar: "ADN similar",
    similarHint: "Criaturas parecidas a la tuya",
    popular: "Populares",
    popularHint: "Más activas ahora",
    fresh: "Nuevas",
    freshHint: "Recién nacidas",
    level: "Nv",
    messages: "msgs",
    match: "match",
    empty: "Aún no hay criaturas",
  },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function CreatureTile({
  creature,
  showSimilarity,
  copy,
}: {
  creature: CreatureCard;
  showSimilarity: boolean;
  copy: (typeof COPY)[keyof typeof COPY];
}) {
  const color =
    (creature.visual as { color?: string } | null)?.color ??
    "#8b5cf6";
  const shape =
    (creature.visual as { shape?: string } | null)?.shape ??
    "circle";
  // Deterministic variation in the idle-float cycle per creature.
  const pulseDuration = 3 + (hashString(creature.id) % 100) / 50;

  return (
    <Link
      href={`/profile/${creature.id}`}
      onClick={() => haptic("tap")}
      className="group shrink-0 w-40 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-white/25 hover:-translate-y-0.5 active:scale-[0.97]"
    >
      {/* Mini creature preview */}
      <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: pulseDuration, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full blur-xl opacity-40"
          style={{ backgroundColor: color }}
        />
        <div
          className={`relative h-14 w-14 ${shape === "square" ? "rounded-xl" : shape === "diamond" ? "rotate-45 rounded-md" : "rounded-full"} border border-white/20 shadow-lg`}
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}, #000 110%)`,
            boxShadow: `0 0 20px ${color}60`,
          }}
        />
        {showSimilarity && typeof creature.dna_similarity === "number" && (
          <span className="absolute -top-1 -right-1 rounded-full bg-fuchsia-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md">
            {Math.round(creature.dna_similarity * 100)}% {copy.match}
          </span>
        )}
      </div>

      {/* Name + info */}
      <p className="mt-2 truncate text-center text-sm font-semibold text-white/90">
        {creature.self_name || "Unknown"}
      </p>
      {creature.species && (
        <p className="truncate text-center text-[10px] text-white/40">
          {creature.species}
        </p>
      )}
      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] text-white/50">
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 tabular-nums">
          {copy.level} {creature.gen_level}
        </span>
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 tabular-nums">
          💬 {creature.total_messages}
        </span>
      </div>
    </Link>
  );
}

function Rail({
  title,
  hint,
  list,
  showSimilarity,
  copy,
}: {
  title: string;
  hint: string;
  list: CreatureCard[];
  showSimilarity: boolean;
  copy: (typeof COPY)[keyof typeof COPY];
}) {
  if (list.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-baseline justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold text-white/90">{title}</h3>
          <p className="text-xs text-white/40">{hint}</p>
        </div>
        <Link
          href="/explore"
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-none snap-x">
        {list.map((c) => (
          <div key={c.id} className="snap-start">
            <CreatureTile creature={c} showSimilarity={showSimilarity} copy={copy} />
          </div>
        ))}
      </div>
    </motion.section>
  );
}

export function DiscoverCreatureSections() {
  const { locale } = useTranslations();
  const loc = (["ko", "en", "ja", "zh", "es"].includes(locale) ? locale : "en") as keyof typeof COPY;
  const copy = COPY[loc];

  const [sections, setSections] = useState<Sections | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/explore", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.sections) {
          setSections(data.sections as Sections);
        }
      } catch {
        // ignore
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sections) {
    return <div className="h-40 rounded-2xl bg-white/[0.04] animate-pulse" />;
  }

  const hasAny =
    sections.similar_dna.length > 0 ||
    sections.popular.length > 0 ||
    sections.new.length > 0;
  if (!hasAny) {
    return (
      <p className="text-center text-xs text-white/30 py-4">{copy.empty}</p>
    );
  }

  return (
    <div className="space-y-5">
      {sections.similar_dna.length > 0 && (
        <Rail
          title={`✨ ${copy.similar}`}
          hint={copy.similarHint}
          list={sections.similar_dna}
          showSimilarity
          copy={copy}
        />
      )}
      {sections.popular.length > 0 && (
        <Rail
          title={`🔥 ${copy.popular}`}
          hint={copy.popularHint}
          list={sections.popular}
          showSimilarity={false}
          copy={copy}
        />
      )}
      {sections.new.length > 0 && (
        <Rail
          title={`🌱 ${copy.fresh}`}
          hint={copy.freshHint}
          list={sections.new}
          showSimilarity={false}
          copy={copy}
        />
      )}
    </div>
  );
}

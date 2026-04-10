"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WrappedData {
  year: number;
  totalMessages: number;
  totalMemories: number;
  coreMemories: number;
  topEmotions: { emotion: string; count: number; percent: number }[];
  agent: {
    name: string;
    level: number;
    streakDays: number;
    species: string;
    evolutionCount: number;
  } | null;
}

const EMOTION_EMOJI: Record<string, string> = {
  joy: "😊", happy: "😄", sad: "😢", curious: "🤔",
  excited: "🎉", calm: "😌", love: "💖", fear: "😨",
  anger: "😠", surprise: "😲", neutral: "💬",
};

const SPECIES_EMOJI: Record<string, string> = {
  fluff: "🐣", ember: "🔥", aqua: "💧", terra: "🌿",
  spark: "⚡", void: "🌑", prism: "🌈", default: "✨",
};

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

interface SlideProps {
  data: WrappedData;
}

function Slide0({ data }: SlideProps) {
  const emoji = data.agent ? (SPECIES_EMOJI[data.agent.species] ?? "✨") : "🌟";
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <motion.div
        className="text-8xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      >
        {emoji}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <p className="text-white/50 text-sm font-medium tracking-widest uppercase mb-2">
          {data.year} Wrapped
        </p>
        <h1 className="text-display text-white mb-1">
          {data.agent?.name ?? "크리처"}
        </h1>
        <p className="text-white/40 text-sm">
          {data.year}년을 함께한 당신의 기록
        </p>
      </motion.div>
    </div>
  );
}

function Slide1({ data }: SlideProps) {
  return (
    <div className="flex flex-col justify-center h-full gap-4 px-2">
      <motion.p
        className="text-white/40 text-xs font-semibold uppercase tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        올해의 대화
      </motion.p>
      <motion.div
        className="text-hero text-white font-black leading-none"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
      >
        {formatNumber(data.totalMessages)}번
      </motion.div>
      <motion.p
        className="text-white/60 text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        크리처와 나눈 대화예요
      </motion.p>
      <motion.div
        className="mt-4 glass-card rounded-2xl p-4 border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <p className="text-white/40 text-xs mb-1">하루 평균</p>
        <p className="text-white text-2xl font-bold">
          {Math.round(data.totalMessages / 365)}번
        </p>
      </motion.div>
    </div>
  );
}

function Slide2({ data }: SlideProps) {
  return (
    <div className="flex flex-col justify-center h-full gap-4 px-2">
      <motion.p
        className="text-white/40 text-xs font-semibold uppercase tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        쌓인 기억
      </motion.p>
      <motion.div
        className="text-hero text-white font-black leading-none"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
      >
        {formatNumber(data.totalMemories)}개
      </motion.div>
      <motion.p
        className="text-white/60 text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        소중한 순간이 기억에 남았어요
      </motion.p>
      {data.coreMemories > 0 && (
        <motion.div
          className="mt-4 rounded-2xl p-4 bg-amber-400/10 border border-amber-400/25"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <p className="text-amber-400/70 text-xs mb-1">⭐ 핵심 기억</p>
          <p className="text-white text-2xl font-bold">{formatNumber(data.coreMemories)}개</p>
          <p className="text-white/40 text-xs mt-1">특별히 중요한 순간들</p>
        </motion.div>
      )}
    </div>
  );
}

function Slide3({ data }: SlideProps) {
  return (
    <div className="flex flex-col justify-center h-full gap-4 px-2">
      <motion.p
        className="text-white/40 text-xs font-semibold uppercase tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        올해의 감정
      </motion.p>
      <motion.p
        className="text-white/60 text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        가장 많이 나눈 감정이에요
      </motion.p>
      <div className="flex flex-col gap-3 mt-2">
        {data.topEmotions.length === 0 ? (
          <p className="text-white/30 text-sm">감정 데이터가 없어요</p>
        ) : (
          data.topEmotions.map((e, idx) => (
            <motion.div
              key={e.emotion}
              className="glass-card rounded-xl p-3 border border-white/10 flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + idx * 0.15 }}
            >
              <span className="text-2xl">{EMOTION_EMOJI[e.emotion] ?? "💬"}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium capitalize">{e.emotion}</span>
                  <span className="text-white/40 text-xs">{e.percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${e.percent}%` }}
                    transition={{ delay: 0.9 + idx * 0.15, duration: 0.6 }}
                  />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function Slide4({ data }: SlideProps) {
  const agent = data.agent;
  if (!agent) return null;

  return (
    <div className="flex flex-col justify-center h-full gap-4 px-2">
      <motion.p
        className="text-white/40 text-xs font-semibold uppercase tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        크리처 성장
      </motion.p>
      <div className="bento-grid gap-3 mt-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {[
          { label: "현재 레벨", value: `Lv.${agent.level}`, icon: "⚡", color: "indigo" },
          { label: "최고 스트릭", value: `${agent.streakDays}일`, icon: "🔥", color: "amber" },
          { label: "진화 횟수", value: `${agent.evolutionCount}회`, icon: "🌟", color: "violet" },
          { label: "종류", value: agent.species.toUpperCase(), icon: SPECIES_EMOJI[agent.species] ?? "✨", color: "green" },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col gap-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + idx * 0.12, type: "spring", stiffness: 200 }}
          >
            <span className="text-xl">{item.icon}</span>
            <p className="text-white/40 text-[10px] mt-1">{item.label}</p>
            <p className="text-white text-lg font-bold">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideEnd({ data }: SlideProps) {
  const emoji = data.agent ? (SPECIES_EMOJI[data.agent.species] ?? "✨") : "🌟";
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <motion.div
        className="text-7xl"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.3 }}
      >
        {emoji}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <p className="text-white/50 text-sm mb-2">
          {data.year}년도 함께해줘서 고마워요
        </p>
        <h2 className="text-2xl font-bold text-white mb-4">
          {data.agent?.name ?? "크리처"}와 함께한 {data.year}년
        </h2>
        <p className="text-white/30 text-xs">
          내년에도 더 많은 추억을 쌓아요 🌟
        </p>
      </motion.div>
    </div>
  );
}

const SLIDES = [Slide0, Slide1, Slide2, Slide3, Slide4, SlideEnd];

export default function WrappedPage() {
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    fetch("/api/wrapped")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const go = (delta: number) => {
    setDirection(delta);
    setSlideIndex((i) => Math.max(0, Math.min(SLIDES.length - 1, i + delta)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40">
        데이터를 불러올 수 없어요
      </div>
    );
  }

  const SlideComponent = SLIDES[slideIndex];

  return (
    <div className="min-h-screen bg-[#0a0a0f] aurora-bg overflow-hidden relative flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pt-8 pb-2 relative z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === slideIndex ? "w-6 bg-white/70" : "w-1.5 bg-white/20"
            }`}
            onClick={() => { setDirection(i > slideIndex ? 1 : -1); setSlideIndex(i); }}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 px-6 py-4 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slideIndex}
            className="h-full"
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <SlideComponent data={data} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 pb-10 relative z-10">
        <button
          onClick={() => go(-1)}
          disabled={slideIndex === 0}
          className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-20 transition-colors"
        >
          ‹
        </button>
        <p className="text-white/20 text-xs">{slideIndex + 1} / {SLIDES.length}</p>
        <button
          onClick={() => go(1)}
          disabled={slideIndex === SLIDES.length - 1}
          className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-20 transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}

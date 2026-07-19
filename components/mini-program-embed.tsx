"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  parseMiniProgramCommand,
  createPoll,
  rollDice,

  MINI_PROGRAM_REGISTRY,

  type MiniProgramType,
  type PollData,
} from "@/lib/chat/mini-programs";
import { haptic } from "@/lib/micro-interactions";

interface MiniProgramEmbedProps {
  command: string;
  locale?: string;
  onResult?: (result: string) => void;
}

/** Inline mini-program renderer for chat bubbles */
export function MiniProgramEmbed({ command, locale = "ko", onResult }: MiniProgramEmbedProps) {
  const parsed = parseMiniProgramCommand(command);

  if (!parsed) return null;

  switch (parsed.type) {
    case "poll":
      return <PollEmbed args={parsed.args} locale={locale} onResult={onResult} />;
    case "quiz":
      return <QuizEmbed args={parsed.args} locale={locale} onResult={onResult} />;
    case "dice":
      return <DiceEmbed args={parsed.args} locale={locale} onResult={onResult} />;
    case "timer":
      return <TimerEmbed args={parsed.args} locale={locale} onResult={onResult} />;
    case "weather":
      return <WeatherEmbed args={parsed.args} locale={locale} />;
    case "mood_check":
      return <MoodEmbed args={parsed.args} locale={locale} onResult={onResult} />;
    default:
      return null;
  }
}

// ── Poll ──
function PollEmbed({ args, locale, onResult }: { args: string; locale: string; onResult?: (r: string) => void }) {
  const isKo = locale === "ko";
  const pollProgram = createPoll("user", args);
  const pollData = pollProgram.data as unknown as PollData;
  const [votes, setVotes] = useState<number[]>(pollData.options.map(() => 0));
  const [voted, setVoted] = useState<number | null>(null);

  const totalVotes = votes.reduce((a, b) => a + b, 0);

  const handleVote = (idx: number) => {
    if (voted !== null) return;
    haptic("tap");
    setVoted(idx);
    setVotes((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)));
    onResult?.(`Voted: ${pollData.options[idx].text}`);
  };

  return (
    <div className="rounded-xl border border-purple-400/20 bg-purple-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">📊</span>
        <span className="text-xs font-semibold text-purple-200">{isKo ? "투표" : "Poll"}</span>
      </div>
      <p className="text-sm text-white/80">{pollData.question}</p>
      <div className="space-y-1.5">
        {pollData.options.map((opt: { id: string; text: string; votes: number }, i: number) => {
          const pct = totalVotes > 0 ? Math.round((votes[i] / totalVotes) * 100) : 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleVote(i)}
              disabled={voted !== null}
              className={`relative w-full rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                voted === i
                  ? "border-purple-400/40 bg-purple-400/20 text-purple-100"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              {voted !== null && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  className="absolute inset-y-0 left-0 rounded-lg bg-purple-400/15"
                />
              )}
              <span className="relative z-10">{opt.text}</span>
              {voted !== null && (
                <span className="relative z-10 float-right text-[10px] text-white/50">{pct}%</span>
              )}
            </button>
          );
        })}
      </div>
      {voted !== null && (
        <p className="text-[10px] text-white/40">{totalVotes} {isKo ? "투표" : "votes"}</p>
      )}
    </div>
  );
}

// ── Quiz ──
function QuizEmbed({ args, locale, onResult }: { args: string; locale: string; onResult?: (r: string) => void }) {
  const isKo = locale === "ko";
  const parts = args.split("|").map((s) => s.trim());
  const question = parts[0] || (isKo ? "퀴즈" : "Quiz");
  const options = parts.slice(1, 5);
  const correctIdx = 0; // First option is correct by convention
  const [selected, setSelected] = useState<number | null>(null);

  if (options.length < 2) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
        <p className="text-xs text-amber-200">{isKo ? "퀴즈 형식: /quiz 질문|정답|오답1|오답2" : "Quiz format: /quiz question|answer|wrong1|wrong2"}</p>
      </div>
    );
  }

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    haptic("tap");
    setSelected(idx);
    onResult?.(idx === correctIdx ? "correct" : "wrong");
  };

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">❓</span>
        <span className="text-xs font-semibold text-amber-200">{isKo ? "퀴즈" : "Quiz"}</span>
      </div>
      <p className="text-sm text-white/80">{question}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(i)}
            disabled={selected !== null}
            className={`rounded-lg border px-3 py-2 text-xs transition-all ${
              selected === null
                ? "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                : i === correctIdx
                  ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-100"
                  : i === selected
                    ? "border-red-400/40 bg-red-400/20 text-red-100"
                    : "border-white/5 bg-white/[0.02] text-white/40"
            }`}
          >
            {opt}
            {selected !== null && i === correctIdx && " ✓"}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className={`text-[10px] ${selected === correctIdx ? "text-emerald-300/70" : "text-red-300/70"}`}>
          {selected === correctIdx ? (isKo ? "정답!" : "Correct!") : (isKo ? "오답..." : "Wrong...")}
        </p>
      )}
    </div>
  );
}

// ── Dice ──
function DiceEmbed({ args, locale, onResult }: { args: string; locale: string; onResult?: (r: string) => void }) {
  const isKo = locale === "ko";
  const [result, setResult] = useState<ReturnType<typeof rollDice> | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleRoll = () => {
    if (rolling || result) return;
    haptic("tap");
    setRolling(true);
    setTimeout(() => {
      const r = rollDice(args || "2d6");
      setResult(r);
      setRolling(false);
      const total = r.results.reduce((a: number, b: number) => a + b, 0);
      onResult?.(`${total}`);
    }, 800);
  };

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">🎲</span>
        <span className="text-xs font-semibold text-cyan-200">{isKo ? "주사위" : "Dice"}</span>
        <span className="text-[10px] text-white/40">{args || "2d6"}</span>
      </div>
      {!result && !rolling && (
        <button
          type="button"
          onClick={handleRoll}
          className="w-full rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/20 transition-all active:scale-95"
        >
          {isKo ? "굴리기" : "Roll"}
        </button>
      )}
      {rolling && (
        <motion.div
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="text-2xl text-center"
        >
          🎲
        </motion.div>
      )}
      {result && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-1"
        >
          <div className="flex justify-center gap-1">
            {result.results.map((r: number, i: number) => (
              <span key={i} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
                {r}
              </span>
            ))}
          </div>
          <p className="text-lg font-bold text-cyan-200">{result.results.reduce((a: number, b: number) => a + b, 0)}</p>
        </motion.div>
      )}
    </div>
  );
}

// ── Timer ──
function TimerEmbed({ args, locale, onResult }: { args: string; locale: string; onResult?: (r: string) => void }) {
  const isKo = locale === "ko";
  const seconds = Math.min(parseInt(args) || 60, 3600);
  const [remaining, setRemaining] = useState(seconds);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || done) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setDone(true);
          setActive(false);
          onResult?.("timer_done");
          haptic("success");
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, done, onResult]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">⏱️</span>
        <span className="text-xs font-semibold text-emerald-200">{isKo ? "타이머" : "Timer"}</span>
      </div>
      <div className="text-center">
        <p className={`text-2xl font-mono font-bold ${done ? "text-emerald-300" : "text-white/80"}`}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-400"
            animate={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {!active && !done && (
        <button
          type="button"
          onClick={() => { setActive(true); haptic("tap"); }}
          className="w-full rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-400/20 transition-all"
        >
          {isKo ? "시작" : "Start"}
        </button>
      )}
      {done && (
        <p className="text-center text-xs text-emerald-300/70">{isKo ? "완료!" : "Done!"}</p>
      )}
    </div>
  );
}

// ── Weather ──
function WeatherEmbed({ args, locale }: { args: string; locale: string }) {
  const isKo = locale === "ko";
  const moods: Record<string, { emoji: string; label: { ko: string; en: string }; bg: string }> = {
    sunny: { emoji: "☀️", label: { ko: "맑음", en: "Sunny" }, bg: "bg-amber-500/10 border-amber-400/20" },
    cloudy: { emoji: "☁️", label: { ko: "흐림", en: "Cloudy" }, bg: "bg-gray-500/10 border-gray-400/20" },
    rainy: { emoji: "🌧️", label: { ko: "비", en: "Rainy" }, bg: "bg-blue-500/10 border-blue-400/20" },
    snowy: { emoji: "❄️", label: { ko: "눈", en: "Snowy" }, bg: "bg-sky-500/10 border-sky-400/20" },
    stormy: { emoji: "⛈️", label: { ko: "폭풍", en: "Stormy" }, bg: "bg-purple-500/10 border-purple-400/20" },
  };
  const key = Object.keys(moods).find((k) => args.toLowerCase().includes(k)) ?? "sunny";
  const weather = moods[key];

  return (
    <div className={`rounded-xl border p-3 ${weather.bg}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{weather.emoji}</span>
        <div>
          <p className="text-sm font-medium text-white/80">
            {isKo ? weather.label.ko : weather.label.en}
          </p>
          <p className="text-[10px] text-white/40">{args || (isKo ? "크리처의 세계 날씨" : "Creature world weather")}</p>
        </div>
      </div>
    </div>
  );
}

// ── Mood ──
 

function MoodEmbed({ args: _args, locale, onResult }: { args: string; locale: string; onResult?: (r: string) => void }) {
  const isKo = locale === "ko";
  const moods = [
    { emoji: "😊", label: { ko: "행복", en: "Happy" }, value: "happy" },
    { emoji: "😢", label: { ko: "슬픔", en: "Sad" }, value: "sad" },
    { emoji: "😡", label: { ko: "화남", en: "Angry" }, value: "angry" },
    { emoji: "😴", label: { ko: "졸림", en: "Sleepy" }, value: "sleepy" },
    { emoji: "🤩", label: { ko: "신남", en: "Excited" }, value: "excited" },
    { emoji: "😰", label: { ko: "불안", en: "Anxious" }, value: "anxious" },
  ];
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">💭</span>
        <span className="text-xs font-semibold text-rose-200">{isKo ? "기분 체크" : "Mood Check"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {moods.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => {
              setSelected(mood.value);
              haptic("tap");
              onResult?.(mood.value);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs transition-all active:scale-95 ${
              selected === mood.value
                ? "border-rose-400/40 bg-rose-400/20 text-rose-100"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
            }`}
          >
            {mood.emoji} {isKo ? mood.label.ko : mood.label.en}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Detect if a message contains a mini-program command */
export function hasMiniProgram(text: string): boolean {
  return parseMiniProgramCommand(text) !== null;
}

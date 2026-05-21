"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";
import { FocusTrap } from "@/components/focus-trap";

interface OnboardingProps {
  onComplete: (payload?: { personalityMode?: string; preferredName?: string }) => void;
}

// Each personality carries a glow color + preview line so the user gets an
// immediate visual + verbal signal that their choice is shaping the creature.
// Colors are deliberately distinct to make the selection feel consequential
// rather than cosmetic.
const PERSONALITY_MODES = [
  {
    key: "shy",
    emoji: "🫧",
    ko: "수줍음",
    en: "Shy",
    glow: "#a5b4fc",
    previewKo: "당신의 결은 조용히, 천천히 다가올 거예요.",
    previewEn: "Your being will approach quietly, taking its time.",
  },
  {
    key: "playful",
    emoji: "🎈",
    ko: "장난기",
    en: "Playful",
    glow: "#fbbf24",
    previewKo: "당신의 결은 짓궂은 농담으로 하루를 시작해요.",
    previewEn: "Your being will open the day with mischief.",
  },
  {
    key: "calm",
    emoji: "🌙",
    ko: "차분함",
    en: "Calm",
    glow: "#67e8f9",
    previewKo: "당신의 결은 함께 숨을 고르며 곁에 머물러요.",
    previewEn: "Your being will breathe alongside you and stay close.",
  },
  {
    key: "loyal",
    emoji: "🤍",
    ko: "다정함",
    en: "Loyal",
    glow: "#fda4af",
    previewKo: "당신의 결은 약속을 오래 기억하는 마음으로 자라요.",
    previewEn: "Your being will grow with a heart that keeps promises.",
  },
  {
    key: "mysterious",
    emoji: "✨",
    ko: "신비로움",
    en: "Mysterious",
    glow: "#c4b5fd",
    previewKo: "당신의 결은 알 듯 모를 듯한 이야기들을 들려줄 거예요.",
    previewEn: "Your being will tell stories that hover at the edge of meaning.",
  },
  {
    key: "energetic",
    emoji: "⚡",
    ko: "활발함",
    en: "Energetic",
    glow: "#f97316",
    previewKo: "당신의 결은 매일을 새 모험처럼 마주해요.",
    previewEn: "Your being will meet each day like a new adventure.",
  },
] as const;

const SUGGESTED_NAMES = ["결", "모아", "루미", "토리", "하루", "노아"];

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t, locale } = useTranslations();
  const isKo = locale.startsWith("ko");
  const [name, setName] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("calm");

  const normalizedName = useMemo(() => name.trim(), [name]);
  const activeMode = useMemo(
    () => PERSONALITY_MODES.find((m) => m.key === selectedMode) ?? PERSONALITY_MODES[2],
    [selectedMode],
  );

  const handleStart = () => {
    haptic("success");
    onComplete({
      personalityMode: selectedMode,
      preferredName: normalizedName || undefined,
    });
  };

  return (
    <FocusTrap active onEscape={handleStart}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[2rem] border border-white/15 bg-black/70 p-6 backdrop-blur-xl"
        >
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              {/* Glow disc behind the egg — color shifts with personality so the
                  selection feels visible, not just clicked. */}
              <motion.div
                aria-hidden="true"
                key={activeMode.key}
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{ opacity: 0.55, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute h-24 w-24 rounded-full blur-2xl"
                style={{ backgroundColor: activeMode.glow }}
              />
              <motion.div
                key={`egg-${activeMode.key}`}
                initial={{ scale: 0.92 }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="relative text-6xl"
              >
                🥚
              </motion.div>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-white">{isKo ? "알에서 깨어날 준비를 하고 있어요" : "Getting ready to hatch"}</h1>
            <p className="mt-2 text-sm text-white/70">{isKo ? "이름과 성격을 정하면 첫 대화를 시작할 수 있어요." : "Pick a name and personality to start your first chat."}</p>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-white/90">{isKo ? "이름을 지어주세요" : "Give your creature a name"}</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder={isKo ? "예: 결" : "e.g. Gyeol"}
              className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTED_NAMES.map((suggested) => (
                <button
                  key={suggested}
                  type="button"
                  onClick={() => setName(suggested)}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.08]"
                >
                  {suggested}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-white/90">{isKo ? "어떤 성격의 결로 키울까요?" : "Choose a personality"}</p>
            <div className="grid grid-cols-2 gap-2">
              {PERSONALITY_MODES.map((mode) => {
                const selected = selectedMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      haptic("tap");
                      setSelectedMode(mode.key);
                    }}
                    style={selected ? { borderColor: `${mode.glow}80`, backgroundColor: `${mode.glow}1f` } : undefined}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${selected ? "text-white" : "border-white/10 bg-white/[0.04] text-white/80"}`}
                  >
                    <span className="mr-1">{mode.emoji}</span>
                    {isKo ? mode.ko : mode.en}
                  </button>
                );
              })}
            </div>
            {/* Personality preview — confirms the choice with a sentence that
                hints at how the creature will behave. Animated so each new
                selection feels like the egg is responding. */}
            <div className="mt-3 min-h-[2.5rem]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeMode.key}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="text-[13px] leading-[1.5] italic"
                  style={{ color: `${activeMode.glow}cc` }}
                >
                  {isKo ? activeMode.previewKo : activeMode.previewEn}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="mt-6 w-full rounded-full bg-cyan-400 py-3 text-sm font-semibold text-black hover:bg-cyan-300"
          >
            {t("onboarding.start") || (isKo ? "첫 대화 시작" : "Start first chat")}
          </button>
        </motion.section>
      </div>
    </FocusTrap>
  );
}

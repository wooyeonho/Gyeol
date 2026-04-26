"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";
import { FocusTrap } from "@/components/focus-trap";

interface OnboardingProps {
  onComplete: (payload?: { personalityMode?: string; preferredName?: string }) => void;
}

const PERSONALITY_MODES = [
  { key: "shy", emoji: "🫧", ko: "수줍음", en: "Shy" },
  { key: "playful", emoji: "🎈", ko: "장난기", en: "Playful" },
  { key: "calm", emoji: "🌙", ko: "차분함", en: "Calm" },
  { key: "loyal", emoji: "🤍", ko: "다정함", en: "Loyal" },
  { key: "mysterious", emoji: "✨", ko: "신비로움", en: "Mysterious" },
  { key: "energetic", emoji: "⚡", ko: "활발함", en: "Energetic" },
] as const;

const SUGGESTED_NAMES = ["결", "모아", "루미", "토리", "하루", "노아"];

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t, locale } = useTranslations();
  const isKo = locale.startsWith("ko");
  const [name, setName] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("calm");

  const normalizedName = useMemo(() => name.trim(), [name]);

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
            <div className="text-6xl">🥚</div>
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
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${selected ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white/80"}`}
                  >
                    <span className="mr-1">{mode.emoji}</span>
                    {isKo ? mode.ko : mode.en}
                  </button>
                );
              })}
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

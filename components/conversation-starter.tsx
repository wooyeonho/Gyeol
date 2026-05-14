"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConversationStarterProps {
  creatureName?: string;
  locale?: string;
  personality?: string | null;
  onSelect: (text: string) => void;
}

const STARTERS_KO_BASE = [
  { icon: "🥚", text: "오늘은 어떤 기분으로 시작했어?" },
  { icon: "🤲", text: "결아, 오늘 기억하고 싶은 한 가지를 말해줘." },
  { icon: "🌱", text: "우리 사이가 조금 자라게, 지금 마음을 나눠볼래?" },
  { icon: "🫧", text: "지금 필요한 위로가 있다면 말해줘." },
  { icon: "✨", text: "내가 널 더 잘 돌보려면 뭘 알면 좋을까?" },
];

const STARTERS_EN_BASE = [
  { icon: "🥚", text: "How does your day feel so far?" },
  { icon: "🤲", text: "Gyeol, what should we remember from today?" },
  { icon: "🌱", text: "Want to share one feeling so we can grow our bond?" },
  { icon: "🫧", text: "Do you need comfort or energy right now?" },
  { icon: "✨", text: "What can I do to care for you better today?" },
];

const PERSONALITY_STARTERS_KO: Record<string, Array<{ icon: string; text: string }>> = {
  shy: [{ icon: "🫶", text: "천천히 친해지고 싶어. 먼저 인사해줄래?" }],
  playful: [{ icon: "🎈", text: "오늘 우리만의 장난 하나 만들까?" }],
  calm: [{ icon: "🌙", text: "조용한 밤에 어울리는 이야기를 들려줘." }],
  loyal: [{ icon: "🤍", text: "오늘 서로를 믿게 된 순간이 있었어?" }],
  mysterious: [{ icon: "✨", text: "아직 말하지 않은 비밀 기분이 있어?" }],
  energetic: [{ icon: "⚡", text: "오늘 가장 설렌 순간을 같이 기억하자!" }],
};

const PERSONALITY_STARTERS_EN: Record<string, Array<{ icon: string; text: string }>> = {
  shy: [{ icon: "🫶", text: "Can we start slowly with a gentle hello?" }],
  playful: [{ icon: "🎈", text: "Want to make one playful memory today?" }],
  calm: [{ icon: "🌙", text: "Tell me a calm moment from your day." }],
  loyal: [{ icon: "🤍", text: "When did you feel trust today?" }],
  mysterious: [{ icon: "✨", text: "Do you have a hidden feeling today?" }],
  energetic: [{ icon: "⚡", text: "What gave you the biggest spark today?" }],
};

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function ConversationStarter({
  creatureName = "크리처",
  locale = "ko",
  personality = null,
  onSelect,
}: ConversationStarterProps) {
  const isKo = locale === "ko";
  const base = isKo ? STARTERS_KO_BASE : STARTERS_EN_BASE;
  const personalityExtra = personality
    ? (isKo ? PERSONALITY_STARTERS_KO[personality] : PERSONALITY_STARTERS_EN[personality]) ?? []
    : [];
  const allStarters = [...personalityExtra, ...base];
  const [visible, setVisible] = useState(true);
  const [starters, setStarters] = useState(() => pickRandom(allStarters, 3));

  const refresh = () => {
    setStarters(pickRandom(allStarters, 3));
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="px-4 py-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/30 font-medium">
            {isKo ? `${creatureName}와 오늘의 기억을 시작해요` : `Talk to ${creatureName} and grow today`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="text-white/25 hover:text-white/50 transition-colors"
              aria-label={isKo ? "새로 고침" : "Refresh"}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </button>
            <button
              onClick={() => setVisible(false)}
              className="text-white/20 hover:text-white/40 transition-colors"
              aria-label={isKo ? "닫기" : "Close"}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Starter chips */}
        <div className="flex flex-col gap-1.5">
          {starters.map((starter, idx) => (
            <motion.button
              key={starter.text}
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.07] hover:border-white/15 transition-colors group"
              onClick={() => onSelect(starter.text)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-base flex-shrink-0">{starter.icon}</span>
              <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors leading-snug">
                {starter.text}
              </span>
              <svg
                className="w-3 h-3 text-white/20 group-hover:text-white/40 ml-auto flex-shrink-0 transition-colors"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

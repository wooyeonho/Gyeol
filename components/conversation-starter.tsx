"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConversationStarterProps {
  creatureName?: string;
  locale?: string;
  onSelect: (text: string) => void;
}

const STARTERS_KO = [
  { icon: "💭", text: "오늘 어떤 생각을 하고 있어?" },
  { icon: "🌙", text: "오늘 하루 어땠어?" },
  { icon: "🎵", text: "지금 기분이 어때?" },
  { icon: "✨", text: "요즘 가장 설레는 게 뭐야?" },
  { icon: "🌊", text: "최근에 새로 알게 된 게 있어?" },
  { icon: "🔥", text: "지금 가장 신경 쓰이는 게 뭐야?" },
  { icon: "🌸", text: "오늘 가장 좋았던 순간은?" },
  { icon: "🧩", text: "요즘 고민이 있어?" },
  { icon: "🌈", text: "만약 오늘 하루를 다시 살 수 있다면?" },
  { icon: "⚡", text: "지금 당장 하고 싶은 게 뭐야?" },
];

const STARTERS_EN = [
  { icon: "💭", text: "What's on your mind today?" },
  { icon: "🌙", text: "How was your day?" },
  { icon: "🎵", text: "How are you feeling right now?" },
  { icon: "✨", text: "What are you most excited about lately?" },
  { icon: "🌊", text: "Learned anything new recently?" },
  { icon: "🔥", text: "What's been on your mind most?" },
  { icon: "🌸", text: "What was the best moment today?" },
  { icon: "🧩", text: "Anything you've been worrying about?" },
  { icon: "🌈", text: "If you could redo today, what would you change?" },
  { icon: "⚡", text: "What do you want to do right now?" },
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function ConversationStarter({
  creatureName = "크리처",
  locale = "ko",
  onSelect,
}: ConversationStarterProps) {
  const isKo = locale === "ko";
  const allStarters = isKo ? STARTERS_KO : STARTERS_EN;
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
            {isKo ? `${creatureName}에게 말 걸어보세요` : `Start a conversation with ${creatureName}`}
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

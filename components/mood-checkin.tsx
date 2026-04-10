"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MOODS = [
  { id: "great", emoji: "😄", label: "최고예요", color: "#4ade80" },
  { id: "good", emoji: "😊", label: "좋아요", color: "#a3e635" },
  { id: "okay", emoji: "😐", label: "그럭저럭", color: "#facc15" },
  { id: "meh", emoji: "😔", label: "별로예요", color: "#fb923c" },
  { id: "bad", emoji: "😢", label: "힘들어요", color: "#f87171" },
];

interface MoodCheckinProps {
  onSubmit?: (mood: string, note: string) => void;
  locale?: string;
}

export function MoodCheckin({ onSubmit, locale = "ko" }: MoodCheckinProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const isKo = locale === "ko";

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit?.(selected, note);
    setSubmitted(true);
  };

  if (submitted) {
    const mood = MOODS.find((m) => m.id === selected);
    return (
      <motion.div
        className="flex flex-col items-center gap-3 py-6 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <span className="text-4xl">{mood?.emoji}</span>
        <p className="text-white/70 text-sm">
          {isKo ? "기분을 기록했어요" : "Mood recorded!"}
        </p>
        <p className="text-white/40 text-xs">
          {isKo ? "크리처가 당신의 기분에 맞춰 반응할게요" : "Your creature will adapt to your mood"}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-white/70">
        {isKo ? "오늘 기분이 어때요?" : "How are you feeling today?"}
      </p>

      {/* Mood selector */}
      <div className="flex gap-2 justify-between">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            onClick={() => setSelected(mood.id)}
            className={`flex flex-col items-center gap-1.5 flex-1 rounded-xl py-2.5 transition-all ${
              selected === mood.id
                ? "bg-white/10 ring-2 ring-offset-1 ring-offset-[#0a0a0f]"
                : "bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
            style={selected === mood.id ? { outline: `2px solid ${mood.color}`, outlineOffset: "2px" } : undefined}
          >
            <span className="text-2xl">{mood.emoji}</span>
            <span className="text-[9px] text-white/40">{mood.label}</span>
          </button>
        ))}
      </div>

      {/* Note */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder={isKo ? "한 마디 더 남길까요? (선택)" : "Anything to add? (optional)"}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 resize-none mt-2"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selected}
        className="w-full rounded-xl py-2.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-30"
      >
        {isKo ? "기록하기" : "Record"}
      </button>
    </div>
  );
}

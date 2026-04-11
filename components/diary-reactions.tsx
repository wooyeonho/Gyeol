"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useTranslations } from "@/components/i18n-provider";

/**
 * Diary reactions — user reacts with emojis to their creature's diary entries.
 * Persisted in localStorage (private to user, no server round-trip).
 */

type Reaction = "heart" | "smile" | "tear" | "sparkle" | "thought";

const REACTION_META: Record<Reaction, { emoji: string; label: Record<string, string>; color: string }> = {
  heart:   { emoji: "❤️", color: "text-rose-400",    label: { ko: "사랑", en: "Love",    ja: "愛",    zh: "爱",    es: "Amor"   } },
  smile:   { emoji: "😊", color: "text-amber-300",   label: { ko: "기쁨", en: "Smile",   ja: "喜び",  zh: "微笑",  es: "Feliz"  } },
  tear:    { emoji: "🥺", color: "text-sky-300",     label: { ko: "애잔", en: "Tender",  ja: "切ない", zh: "心疼",  es: "Tierno" } },
  sparkle: { emoji: "✨", color: "text-violet-300",  label: { ko: "반짝", en: "Wow",     ja: "すごい", zh: "闪耀",  es: "Guau"   } },
  thought: { emoji: "💭", color: "text-slate-300",   label: { ko: "생각", en: "Hmm",     ja: "ふむ",  zh: "思考",  es: "Mmm"    } },
};

const REACTIONS: Reaction[] = ["heart", "smile", "tear", "sparkle", "thought"];

const STORAGE_KEY = "gyeol.diary.reactions.v1";

type ReactionMap = Record<string, Reaction[]>;

function readAll(): ReactionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as ReactionMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ReactionMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

interface Props {
  entryId: string;
}

export function DiaryReactions({ entryId }: Props) {
  const { locale } = useTranslations();
  const loc = (["ko", "en", "ja", "zh", "es"].includes(locale) ? locale : "en") as keyof typeof REACTION_META["heart"]["label"];
  // Lazy init — reads from localStorage on first render. Parent passes a `key`
  // prop keyed on entryId so switching entries remounts this component.
  const [picked, setPicked] = useState<Set<Reaction>>(() => {
    if (typeof window === "undefined") return new Set();
    const all = readAll();
    return new Set(all[entryId] ?? []);
  });
  const [burstKey, setBurstKey] = useState<string | null>(null);
  const burstCounter = useRef(0);

  function toggle(r: Reaction) {
    const next = new Set(picked);
    if (next.has(r)) {
      next.delete(r);
    } else {
      next.add(r);
      burstCounter.current += 1;
      setBurstKey(`${r}-${burstCounter.current}`);
      // Light haptic
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(8); } catch { /* ignore */ }
      }
    }
    setPicked(next);
    const all = readAll();
    all[entryId] = Array.from(next);
    writeAll(all);
  }

  const hint =
    loc === "ko" ? "이 순간을 기억하세요" :
    loc === "ja" ? "この瞬間を記録しよう" :
    loc === "zh" ? "记住这一刻" :
    loc === "es" ? "Recuerda este momento" :
    "Mark this moment";

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-2">{hint}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((r) => {
          const meta = REACTION_META[r];
          const on = picked.has(r);
          return (
            <motion.button
              key={r}
              type="button"
              onClick={() => toggle(r)}
              whileTap={{ scale: 0.9 }}
              className={`group relative flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all ${
                on
                  ? "border-white/25 bg-white/10 shadow-md"
                  : "border-white/5 bg-white/[0.03] hover:bg-white/[0.07]"
              }`}
              aria-pressed={on}
              aria-label={meta.label[loc]}
            >
              <motion.span
                animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className="text-sm leading-none"
              >
                {meta.emoji}
              </motion.span>
              <span className={`${on ? meta.color : "text-white/50"} font-medium`}>
                {meta.label[loc]}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Emoji burst on pick */}
      <AnimatePresence>
        {burstKey && (
          <motion.div
            key={burstKey}
            initial={{ opacity: 1, y: 0, scale: 0.6 }}
            animate={{ opacity: 0, y: -28, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            onAnimationComplete={() => setBurstKey(null)}
            className="pointer-events-none absolute text-2xl"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            {REACTION_META[burstKey.split("-")[0] as Reaction].emoji}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

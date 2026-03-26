import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StarterPrompts } from "./starter-prompts";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
};

/** Only render the last N messages in the DOM to avoid excessive DOM nodes. */
const VISIBLE_MESSAGE_CAP = 100;

export function MessageList({
  messages,
  isStreaming,
  isFirstSession,
  firstSessionConfig,
  vitality,
  starterPrompts,
  appearance,
  bottomRef,
  isHydratingHistory,
  isPlaying,
  copiedIndex,
  onPromptClick,
  onSpeak,
  onStop,
  onCopy,
  onRetry,
  t,
  verbal,
}: {
  messages: Array<{ id?: string; role: string; content: string; error?: boolean; dnaShift?: string[]; traitEmerged?: { id: string; name: { ko: string; en: string } }[] }>;
  isStreaming: boolean;
  isFirstSession: boolean;
  firstSessionConfig: { heading: string; helper: string };
  vitality: number;
  starterPrompts: string[];
  appearance: ResolvedIdentityAppearance;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  isHydratingHistory?: boolean;
  isPlaying: boolean;
  copiedIndex: number | null;
  onPromptClick: (prompt: string) => void;
  onSpeak: (content: string) => void;
  onStop: () => void;
  onCopy: (index: number, content: string) => void;
  onRetry: () => void;
  t: (key: string) => string;
  verbal?: number;
}) {
  // Cap rendered messages to avoid excessive DOM nodes (virtual scroll lite)
  const visibleMessages = useMemo(
    () => messages.length > VISIBLE_MESSAGE_CAP ? messages.slice(-VISIBLE_MESSAGE_CAP) : messages,
    [messages],
  );
  // Offset for correct index mapping when messages are capped
  const indexOffset = messages.length - visibleMessages.length;

  // Verbal-based bubble style
  const v = verbal ?? 0.5;
  const assistantBubbleExtra = v < 0.15
    ? "max-w-[50%] px-3 py-2 font-mono text-xs tracking-widest text-center opacity-80 italic"
    : v < 0.35
      ? "max-w-[60%] px-3 py-2 text-sm tracking-wide text-center opacity-90"
      : v < 0.55
        ? "max-w-[70%] px-4 py-3 text-sm leading-6"
        : v >= 0.75
          ? "max-w-[90%] px-5 py-4 text-base leading-8 font-light tracking-wide"
          : "max-w-[80%] px-4 py-3 text-base leading-7";

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4 pr-1"
      style={{ contain: "layout style" }}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label={t("chat.logAriaLabel")}
    >
      {isHydratingHistory && (
        <div className="rounded-3xl border border-white/10 bg-black/30 px-5 py-6 text-sm text-white/55">
          {t("common.loading")}
        </div>
      )}
      {!isHydratingHistory && messages.length === 0 && (
        <StarterPrompts
          isFirstSession={isFirstSession}
          firstSessionConfig={firstSessionConfig}
          vitality={vitality}
          starterPrompts={starterPrompts}
          appearance={appearance}
          isStreaming={isStreaming}
          onPromptClick={onPromptClick}
          t={t}
        />
      )}
      <AnimatePresence initial={false}>
      {visibleMessages.map((m, vi) => {
        const i = vi + indexOffset; // original index for callbacks
        return (
        <motion.div
          key={m.id ?? `${m.role}-${i}`}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          variants={messageVariants}
          initial="hidden"
          animate="visible"
          layout
        >
          {m.role === "user" ? (
            <motion.div
              className="max-w-[80%] break-words rounded-2xl bg-white/12 px-4 py-3 text-base leading-7 text-white"
              whileTap={{ scale: 0.98 }}
            >
              {m.content}
            </motion.div>
          ) : (
            <motion.div
              className={`rounded-2xl border bg-black/40 ${assistantBubbleExtra}`}
              style={{
                borderColor: `${appearance.palette.primary}35`,
                boxShadow: `0 0 0 1px ${appearance.palette.primary}12 inset`,
              }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="whitespace-pre-wrap break-words">
                {m.content}
                {isStreaming && i === messages.length - 1 && (
                  <motion.span
                    className="ml-1 inline-block"
                    style={{ color: appearance.palette.primary }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    |
                  </motion.span>
                )}
              </p>
              {!isStreaming && i === messages.length - 1 && !m.error && (
                <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {appearance.voice.toneHint}
                </p>
              )}
              {m.dnaShift && m.dnaShift.length > 0 && !isStreaming && (
                <motion.div
                  className="mt-1.5 flex flex-wrap gap-1.5"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {m.dnaShift.map((axis) => (
                    <span
                      key={axis}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: `${appearance.palette.primary}18`,
                        color: appearance.palette.primary,
                        border: `1px solid ${appearance.palette.primary}30`,
                      }}
                    >
                      {axis} +
                    </span>
                  ))}
                </motion.div>
              )}
              {m.traitEmerged && m.traitEmerged.length > 0 && !isStreaming && (
                <motion.div
                  className="mt-2 rounded-xl border p-2.5"
                  style={{
                    borderColor: `${appearance.palette.primary}40`,
                    background: `${appearance.palette.primary}0a`,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, type: "spring" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: appearance.palette.primary }}>
                    New Trait
                  </p>
                  {m.traitEmerged.map((trait) => (
                    <p key={trait.id} className="mt-0.5 text-xs text-white/80">
                      {typeof trait.name === "string" ? trait.name : (trait.name.ko || trait.name.en)}
                    </p>
                  ))}
                </motion.div>
              )}
              {!isStreaming && m.error && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-400/10 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t("chat.retry")}
                  </button>
                </div>
              )}
              {!isStreaming && m.content && !m.error && (
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPlaying) onStop();
                      else onSpeak(m.content);
                    }}
                    className="min-h-10 rounded-xl px-3 text-sm text-white/78 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {isPlaying ? t("chat.stop") : t("chat.listen")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopy(i, m.content)}
                    className="min-h-10 rounded-xl px-3 text-sm text-white/78 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {copiedIndex === i ? t("chat.copied") : t("chat.copy")}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
        );
      })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

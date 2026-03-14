import { motion, AnimatePresence } from "framer-motion";
import { StarterPrompts } from "./starter-prompts";

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

export function MessageList({
  messages,
  isStreaming,
  isFirstSession,
  firstSessionConfig,
  vitality,
  locale,
  starterPrompts,
  appearance,
  bottomRef,
  isPlaying,
  copiedIndex,
  onPromptClick,
  onSpeak,
  onStop,
  onCopy,
  onRetry,
  t,
}: {
  messages: Array<{ role: string; content: string; error?: boolean }>;
  isStreaming: boolean;
  isFirstSession: boolean;
  firstSessionConfig: any;
  vitality: number;
  locale: "ko" | "en";
  starterPrompts: string[];
  appearance: any;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  copiedIndex: number | null;
  onPromptClick: (prompt: string) => void;
  onSpeak: (content: string) => void;
  onStop: () => void;
  onCopy: (index: number, content: string) => void;
  onRetry: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className="flex-1 overflow-y-auto space-y-4 py-4"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="채팅 메시지"
    >
      {messages.length === 0 && (
        <StarterPrompts
          isFirstSession={isFirstSession}
          firstSessionConfig={firstSessionConfig}
          vitality={vitality}
          locale={locale}
          starterPrompts={starterPrompts}
          appearance={appearance}
          isStreaming={isStreaming}
          onPromptClick={onPromptClick}
          t={t}
        />
      )}
      <AnimatePresence initial={false}>
      {messages.map((m, i) => (
        <motion.div
          key={i}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          variants={messageVariants}
          initial="hidden"
          animate="visible"
          layout
        >
          {m.role === "user" ? (
            <motion.div
              className="bg-white/10 rounded-2xl px-4 py-2 max-w-[80%] break-words"
              whileTap={{ scale: 0.98 }}
            >
              {m.content}
            </motion.div>
          ) : (
            <motion.div
              className="max-w-[80%] rounded-2xl border bg-black/35 px-4 py-2"
              style={{
                borderColor: `${appearance.palette.primary}35`,
                boxShadow: `0 0 0 1px ${appearance.palette.primary}12 inset`,
              }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="whitespace-pre-wrap leading-relaxed break-words">
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
                <p className="mt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {appearance.voice.toneHint}
                </p>
              )}
              {!isStreaming && m.error && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-400/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-400/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {locale === "ko" ? "다시 연결 시도" : "Retry Connection"}
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
                    className="text-[11px] text-white/50 hover:text-white/80 transition-colors"
                  >
                    {isPlaying ? "정지" : "듣기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopy(i, m.content)}
                    className="text-[11px] text-white/50 hover:text-white/80 transition-colors"
                  >
                    {copiedIndex === i ? t("chat.copied") : t("chat.copy")}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

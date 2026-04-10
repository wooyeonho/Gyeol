import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic, playSound } from "@/lib/micro-interactions";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";
import type { VoiceInputState } from "@/hooks/use-voice-input";
import type { CreatureDNA } from "@/lib/genome/dna";
import type { Sticker } from "@/lib/creature/sticker-system";

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="20" x2="12" y2="24" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function MessageInput({
  input,
  setInput,
  isStreaming,
  placeholder,
  appearance,
  onSubmit,
  voiceState,
  voiceError,
  onVoiceToggle,
  onStopStreaming,
  onStickerSelect,
  creatureDna,
  creatureName,
  locale,
  t,
}: {
  input: string;
  setInput: (value: string) => void;
  isStreaming: boolean;
  placeholder: string;
  appearance: ResolvedIdentityAppearance;
  onSubmit: (e: React.FormEvent | React.KeyboardEvent) => void;
  voiceState: VoiceInputState;
  voiceError: string | null;
  onVoiceToggle: () => void;
  onStopStreaming: () => void;
  onStickerSelect?: (sticker: Sticker) => void;
  creatureDna?: CreatureDNA | null;
  creatureName?: string;
  locale?: string;
  t: (key: string) => string;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showStickers, setShowStickers] = useState(false);

  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitWithFeedback(e);
    }
  };

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }, [input]);

  const handleSubmitWithFeedback = (e: React.FormEvent | React.KeyboardEvent) => {
    if (!input.trim() || isStreaming) {
      onSubmit(e);
      return;
    }
    haptic("send");
    playSound("send");
    onSubmit(e);
  };

  const isRecording = voiceState === "recording";
  const isTranscribing = voiceState === "transcribing";
  const showSendButton = input.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-1">
      {voiceError && (
        <p className="px-2 text-xs text-red-400/90">{voiceError}</p>
      )}
      {isRecording && (
        <div className="flex items-center gap-2 px-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-xs text-red-300/80">{t("voice.recording")}</span>
        </div>
      )}
      {isTranscribing && (
        <div className="flex items-center gap-2 px-2">
          <SpinnerIcon className="h-3 w-3 text-white/60" />
          <span className="text-xs text-white/50">{t("voice.transcribing")}</span>
        </div>
      )}
      {/* Sticker picker panel */}
      {creatureDna && onStickerSelect && (
        <AnimatePresence>
          {showStickers && (
            <div className="mb-2">
              <StickerPickerLazy
                dna={creatureDna}
                creatureName={creatureName || "Creature"}
                locale={locale || "ko"}
                onSelect={(sticker) => {
                  onStickerSelect(sticker);
                  setShowStickers(false);
                }}
                onClose={() => setShowStickers(false)}
              />
            </div>
          )}
        </AnimatePresence>
      )}

      <form data-tutorial="chat-input" onSubmit={handleSubmitWithFeedback} className="flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">
          {t("chat.inputLabel")}
        </label>

        {/* Mic button */}
        <motion.button
          type="button"
          onClick={() => {
            haptic("tap");
            onVoiceToggle();
          }}
          disabled={isTranscribing}
          className="min-h-12 min-w-12 flex-shrink-0 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-40"
          style={{
            background: isRecording ? "rgba(239,68,68,0.25)" : `${appearance.palette.primary}15`,
            border: `1px solid ${isRecording ? "rgba(239,68,68,0.4)" : `${appearance.palette.primary}30`}`,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          aria-label={isRecording ? t("voice.stopRecording") : t("voice.startRecording")}
        >
          {isRecording ? (
            <StopIcon className="mx-auto h-5 w-5 text-red-400" />
          ) : isTranscribing ? (
            <SpinnerIcon className="mx-auto h-5 w-5 text-white/60" />
          ) : (
            <MicIcon className="mx-auto h-5 w-5 text-white/70" />
          )}
        </motion.button>

        {/* Sticker button */}
        {creatureDna && onStickerSelect && (
          <motion.button
            type="button"
            onClick={() => {
              haptic("tap");
              setShowStickers((prev) => !prev);
            }}
            className="min-h-12 min-w-12 flex-shrink-0 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{
              background: showStickers ? `${appearance.palette.primary}25` : `${appearance.palette.primary}10`,
              border: `1px solid ${showStickers ? `${appearance.palette.primary}40` : `${appearance.palette.primary}20`}`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            aria-label={t("chat.stickers") || "Stickers"}
            aria-expanded={showStickers}
          >
            <span className="text-lg">😊</span>
          </motion.button>
        )}

        <textarea
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? t("voice.listeningPlaceholder") : placeholder}
          disabled={isRecording}
          rows={1}
          className="min-h-12 max-h-[180px] flex-1 resize-none overflow-y-auto rounded-2xl bg-white/8 px-4 py-3 text-base leading-6 text-white placeholder-white/72 transition-all focus:outline-none focus:ring-2 disabled:opacity-50"
          style={{
            boxShadow: `0 0 0 1px ${appearance.palette.primary}20 inset`,
            border: `1px solid transparent`,
          }}
        />

        {isStreaming ? (
          <motion.button
            type="button"
            onClick={onStopStreaming}
            className="min-h-12 min-w-12 rounded-2xl px-4 text-base font-semibold text-white transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{ background: "rgba(239,68,68,0.22)", border: "1px solid rgba(239,68,68,0.38)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
          >
            {t("chat.stop")}
          </motion.button>
        ) : showSendButton ? (
          <motion.button
            type="submit"
            disabled={!input.trim()}
            className="min-h-12 min-w-12 rounded-2xl px-5 text-base font-semibold text-white transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50"
            style={{ background: `${appearance.palette.primary}28`, border: `1px solid ${appearance.palette.primary}40` }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
          >
            {t("chat.send")}
          </motion.button>
        ) : null}
      </form>
    </div>
  );
}

/* Lazy-load StickerPicker to avoid bundling sticker-system in main chat chunk */
import dynamic from "next/dynamic";

const StickerPickerLazy = dynamic(
  () => import("@/components/sticker-picker").then((m) => ({ default: m.StickerPicker })),
  { ssr: false, loading: () => <div className="h-48 rounded-2xl bg-white/5 animate-pulse" /> },
);

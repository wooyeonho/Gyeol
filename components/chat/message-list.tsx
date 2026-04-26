import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StarterPrompts } from "./starter-prompts";
import { TypingIndicator } from "@/components/typing-indicator";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";
import { applyJargonMask, type SimpleModeLevel } from "@/lib/i18n/jargon-map";

/**
 * Convert a subset of Markdown to safe HTML for AI assistant messages.
 *
 * Supported: **bold**, *italic*, `inline code`, ```fenced code blocks```,
 * - unordered list items, 1. ordered list items, paragraph breaks.
 *
 * Never allows raw HTML passthrough — only the generated tags below can
 * appear in the output, preventing XSS even if the AI model returns HTML.
 */
function markdownToSafeHtml(md: string): string {
  let html = md
    // Escape any HTML entities first so we never render raw HTML from AI output
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre class="my-2 overflow-x-auto rounded-lg bg-white/8 px-3 py-2 text-xs font-mono text-white/85"><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-white/12 px-1 py-0.5 text-xs font-mono text-white/90">$1</code>');

  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

  // Italic (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // Unordered list (lines starting with "- " or "* ")
  html = html.replace(/^[*-] (.+)/gm, '<li class="ml-4 list-disc">$1</li>');

  // Ordered list (lines starting with "1. " etc.)
  html = html.replace(/^\d+\. (.+)/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li[\s\S]*?<\/li>)(\n<li[\s\S]*?<\/li>)*/g, (match) =>
    `<ul class="my-1 space-y-0.5">${match}</ul>`
  );

  // Paragraph breaks (double newline)
  html = html.replace(/\n{2,}/g, '</p><p class="mt-2">');

  // Single newlines → <br>
  html = html.replace(/\n/g, "<br/>");

  return `<p>${html}</p>`;
}

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
};

/**
 * Render the last N messages in the DOM.
 * Prevents excessive DOM nodes for power users with long conversation histories.
 * TODO: Replace with @tanstack/virtual for true infinite history navigation.
 */
const VISIBLE_MESSAGE_CAP = 300;

function pickEvolutionCopy(locale: string | undefined, dnaShift?: string[], traitEmerged?: { id: string; name: { ko: string; en: string } }[]) {
  const isKo = locale?.startsWith("ko") ?? true;
  const axisSet = new Set(dnaShift ?? []);
  const traitIds = new Set((traitEmerged ?? []).map((trait) => trait.id));

  if (axisSet.has("curiosity")) return isKo ? "호기심이 조금 자랐어요" : "Curiosity grew a little.";
  if (axisSet.has("playfulness") || traitIds.has("trickster")) return isKo ? "더 장난스러워졌어요" : "A little more playful now.";
  if (axisSet.has("empathy") || axisSet.has("warmth") || traitIds.has("heart_reader")) return isKo ? "당신을 조금 더 신뢰해요" : "Trust grew a little.";
  if (traitIds.has("quiet_anchor") || axisSet.has("stability")) return isKo ? "조용하지만 더 깊이 반응하기 시작했어요" : "Quiet, but responding more deeply.";
  return isKo ? "새로운 성격 조짐이 보여요" : "New personality signs are showing.";
}

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
  onRetryMessage,
  t,
  verbal,
  simpleModeLevel,
  locale,
  accentColor,
  creatureName,
  typingLabel,
}: {
  messages: Array<{ id?: string; role: string; content: string; error?: boolean; pending?: boolean; dnaShift?: string[]; traitEmerged?: { id: string; name: { ko: string; en: string } }[]; memoryMoment?: { memory: string; age_days: number; similarity: number }; resonance?: { score: number; delta: number; topOverlap: { axis: string; closeness: number }[] } }>;
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
  onRetryMessage?: (messageId: string) => void;
  t: (key: string) => string;
  verbal?: number;
  /** Simple mode jargon masking level */
  simpleModeLevel?: SimpleModeLevel;
  /** Locale for jargon substitution */
  locale?: string;
  /** Accent color for typing indicator */
  accentColor?: string;
  /** Creature name for typing indicator */
  creatureName?: string;
  /** Localized "{name} is thinking..." template for typing indicator */
  typingLabel?: string;
}) {
  // Cap rendered messages to avoid excessive DOM nodes (virtual scroll lite)
  const visibleMessages = useMemo(
    () => messages.length > VISIBLE_MESSAGE_CAP ? messages.slice(-VISIBLE_MESSAGE_CAP) : messages,
    [messages],
  );
  // Offset for correct index mapping when messages are capped
  const indexOffset = messages.length - visibleMessages.length;

  // Jargon mask for simple mode — applies vocabulary substitution to AI messages
  const maskJargon = useCallback(
    (text: string) => {
      if (!simpleModeLevel || simpleModeLevel === "off") return text;
      const jargonLocale = locale === "ko" || locale === "ko-KR" ? "ko" : "en";
      return applyJargonMask(text, simpleModeLevel, jargonLocale);
    },
    [simpleModeLevel, locale],
  );

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
              className={`max-w-[80%] break-words rounded-2xl px-4 py-3 text-base leading-7 text-white ${m.error ? "bg-red-400/10 border border-red-400/20" : "bg-white/12"}`}
              whileTap={{ scale: 0.98 }}
            >
              {m.content}
              {/* KakaoTalk-style optimistic sent/read indicator */}
              <div className="mt-1 flex items-center justify-end gap-1">
                {m.pending ? (
                  /* Pending: clock icon — message sent optimistically, waiting for server */
                  <motion.svg
                    className="h-3 w-3 text-white/30"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <circle cx="8" cy="8" r="6.5" />
                    <polyline points="8 4.5 8 8 10.5 9.5" />
                  </motion.svg>
                ) : m.error ? (
                  /* Error: red warning icon with retry */
                  <button
                    type="button"
                    onClick={() => m.id && onRetryMessage?.(m.id)}
                    className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] text-red-300/80 transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-300/50"
                    title={t("chat.retry")}
                  >
                    <svg className="h-3 w-3 text-red-400/70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="6.5" />
                      <line x1="8" y1="5" x2="8" y2="8.5" />
                      <circle cx="8" cy="10.5" r="0.5" fill="currentColor" />
                    </svg>
                    {t("chat.retry")}
                  </button>
                ) : isStreaming && i === messages.length - 2 ? (
                  /* Streaming: single check — sent, AI is responding */
                  <svg className="h-3 w-3 text-white/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 8 6 12 14 4" />
                  </svg>
                ) : i < messages.length - 1 ? (
                  /* Double-check: message was read (AI responded) */
                  <motion.svg
                    className="h-3 w-3 text-cyan-400/60"
                    viewBox="0 0 20 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <polyline points="1 8 5 12 11 4" />
                    <polyline points="7 8 11 12 17 4" />
                  </motion.svg>
                ) : (
                  /* Single-check: sent and confirmed */
                  <svg className="h-3 w-3 text-white/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 8 6 12 14 4" />
                  </svg>
                )}
              </div>
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
              {/* Render streaming messages as plain text; completed messages as markdown */}
              {isStreaming && i === messages.length - 1 ? (
                <p className="whitespace-pre-wrap break-words">
                  {maskJargon(m.content)}
                  <motion.span
                    className="ml-1 inline-block"
                    style={{ color: appearance.palette.primary }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    |
                  </motion.span>
                </p>
              ) : (
                <div
                  className="prose-gyeol break-words leading-relaxed"
                  // Safe: markdownToSafeHtml escapes all input HTML before converting markdown
                   
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(maskJargon(m.content)) }}
                />
              )}
              {!isStreaming && i === messages.length - 1 && !m.error && (
                <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {appearance.voice.toneHint}
                </p>
              )}
              {m.dnaShift && m.dnaShift.length > 0 && !isStreaming && (
                <motion.div
                  className="mt-2 rounded-xl border p-2.5"
                  style={{
                    borderColor: `${appearance.palette.primary}40`,
                    background: `${appearance.palette.primary}0a`,
                  }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: appearance.palette.primary }}>
                    {locale?.startsWith("ko") ? "새로운 성격 조짐" : "Personality Shift"}
                  </p>
                  <p className="mt-1 text-xs text-white/85">
                    {pickEvolutionCopy(locale, m.dnaShift, m.traitEmerged)}
                  </p>
                </motion.div>
              )}
              {m.memoryMoment && !isStreaming && (
                <motion.div
                  className="mt-2 rounded-xl border p-2.5"
                  style={{
                    borderColor: `${appearance.palette.primary}30`,
                    background: `linear-gradient(135deg, ${appearance.palette.primary}08, ${appearance.palette.primary}03)`,
                  }}
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${appearance.palette.primary}95` }}>
                    {locale?.startsWith("ko") ? "새 기억이 생겼어요" : "A new memory formed"}
                  </p>
                  <p className="mt-1 text-xs text-white/80 line-clamp-2">
                    {locale?.startsWith("ko") ? "결이 기억했어요:" : "Gyeol remembered:"} {maskJargon(m.memoryMoment.memory)}
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">
                    {locale?.startsWith("ko")
                      ? "이 기억은 앞으로 대화에 영향을 줄 수 있어요"
                      : "This memory may influence future chats."}
                  </p>
                </motion.div>
              )}
              {m.resonance && !isStreaming && (m.resonance.score >= 60 || Math.abs(m.resonance.delta) >= 2) && (
                <motion.div
                  className="mt-2 flex items-center gap-2 rounded-full border px-2.5 py-1"
                  style={{
                    borderColor: `${appearance.palette.primary}35`,
                    background: `${appearance.palette.primary}10`,
                  }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  title={m.resonance.topOverlap.map((o) => `${o.axis}: ${Math.round(o.closeness * 100)}%`).join(" · ")}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `${appearance.palette.primary}b0` }}>
                    결맞춤
                  </span>
                  <span className="text-xs font-semibold" style={{ color: appearance.palette.primary }}>
                    {m.resonance.score.toFixed(1)}
                  </span>
                  {m.resonance.delta !== 0 && (
                    <span className="text-[10px]" style={{ color: m.resonance.delta > 0 ? "#9fe8a8" : "#f3a4a4" }}>
                      {m.resonance.delta > 0 ? "▲" : "▼"}{Math.abs(m.resonance.delta).toFixed(1)}
                    </span>
                  )}
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
                    {locale?.startsWith("ko") ? "새로운 성격 조짐" : "Trait Emerged"}
                  </p>
                  <p className="mt-1 text-xs text-white/85">
                    {pickEvolutionCopy(locale, m.dnaShift, m.traitEmerged)}
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
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            className="px-2 pb-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
          >
            <TypingIndicator
              accentColor={accentColor}
              creatureName={creatureName}
              label={typingLabel}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

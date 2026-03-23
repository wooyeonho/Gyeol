"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTTS } from "@/hooks/use-tts";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";

function getFirstSessionConfig(t: (key: string) => string) {
  return {
    heading: t("chat.firstSessionHeading"),
    helper: t("chat.firstSessionHelper"),
    placeholder: t("chat.firstSessionPlaceholder"),
    prompts: [
      t("chat.firstPrompt1"),
      t("chat.firstPrompt2"),
      t("chat.firstPrompt3"),
    ],
  };
}

function getReturningPrompts(t: (key: string) => string) {
  return [
    t("home.returningPrompt1"),
    t("home.returningPrompt2"),
    t("home.returningPrompt3"),
  ];
}

export function ChatPanel({ navVisible = true }: { navVisible?: boolean }) {
  const { locale, t } = useTranslations();
  const {
    messages,
    isStreaming,
    sendMessage,
    pendingUsageMode,
    retryLastMessage,
    hydrateRecentMessages,
    historyLoaded,
    stopStreaming,
  } = useChatStore();
  const agentState = useAgentStore((state) => state.agentState);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem("gyeol-chat-draft") ?? "";
    } catch {
      return "";
    }
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [signupBannerDismissed, setSignupBannerDismissed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { is_anonymous?: boolean } | null } }) => {
      if (data?.user?.is_anonymous) setIsAnonymous(true);
    }).catch(() => {});
  }, []);

  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
  const verbal = (agentState?.genome as { dna?: { verbal?: number } } | undefined)?.dna?.verbal ?? 0.5;
  const isSilentMode = verbal < 0.15;

  const handleSilentTouch = useCallback((action: string) => {
    if (!isStreaming) {
      void sendMessage(action, { source: "input", locale, totalMessages });
    }
  }, [isStreaming, sendMessage, locale, totalMessages]);
  const isFirstSession = totalMessages === 0 && messages.length === 0;
  const firstSessionConfig = getFirstSessionConfig(t);
  const starterPrompts = isFirstSession ? firstSessionConfig.prompts : getReturningPrompts(t);
  const placeholder = isFirstSession ? firstSessionConfig.placeholder : t("chat.placeholder");
  const appearance = resolveIdentityAppearance(
    {
      selfName: typeof agentState?.self_name === "string" ? agentState.self_name : null,
      visual: (agentState?.visual as { color?: string | null; shape?: string | null; glow?: number | null; particles?: number | null; animation?: string | null; background?: string | null } | undefined) ?? null,
      genome: (agentState?.genome as { species?: string | null; mutations?: string[] | null } | undefined) ?? null,
      selfModel: (agentState?.self_model as { current_role?: string | null; identity_statement?: string | null } | undefined) ?? null,
      config: {
        mutation_trait: typeof config.mutation_trait === "string" ? config.mutation_trait : null,
        usage_profile: pendingUsageMode
          ? { ...(config.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined), primary_mode: pendingUsageMode }
          : ((config.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined) ?? null),
      },
      genLevel: typeof agentState?.gen_level === "number" ? agentState.gen_level : 1,
      vitality: typeof agentState?.vitality === "number" ? agentState.vitality : 1,
      mood: typeof agentState?.mood === "string" ? agentState.mood : null,
      dnaVerbal: ((agentState?.genome as { dna?: { verbal?: number } } | null | undefined)?.dna?.verbal) ?? null,
    },
    locale
  );

  const { speak, stop, isPlaying } = useTTS({
    pitch: appearance.voice.pitch,
    speed: appearance.voice.speed,
    tremor: appearance.voice.tremor,
    lang: t("chat.langCode"),
  });

  const voiceLangMap: Record<string, string> = { "ko-KR": "ko", "en-US": "en", "ja-JP": "ja", "zh-CN": "zh", "es-ES": "es" };
  const voiceInput = useVoiceInput({
    language: voiceLangMap[t("chat.langCode")] ?? "ko",
    onTranscript: (text) => {
      const { isStreaming: currentlyStreaming } = useChatStore.getState();
      if (currentlyStreaming) return;
      setInput(text);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth", block: "end" });
  }, [isStreaming, messages]);

  useEffect(() => {
    try {
      window.localStorage.removeItem("gyeol-chat-draft");
    } catch {
      // Ignore storage failures.
    }
  }, []);

  useEffect(() => {
    if (historyLoaded || messages.length > 0 || totalMessages === 0) return;
    let cancelled = false;
    async function loadHistory() {
      try {
        const res = await fetch("/api/chat/history");
        const json = await res.json().catch(() => ({ messages: [] }));
        if (!cancelled) {
          hydrateRecentMessages(
            Array.isArray(json.messages)
              ? (json.messages as Array<{ id?: string; role: "user" | "assistant"; content: string; error?: boolean }>)
              : [],
          );
        }
      } catch {
        if (!cancelled) hydrateRecentMessages([]);
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyLoaded, hydrateRecentMessages, messages.length, totalMessages]);

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed, { source: "input", locale, totalMessages });
    setInput("");
  };

  const handleCopy = async (index: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((prev) => (prev === index ? null : prev)), 1200);
    } catch {
      setCopiedIndex(null);
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col px-4 ${navVisible ? "pb-24" : "pb-6"}`}>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            isFirstSession={isFirstSession}
            firstSessionConfig={firstSessionConfig}
            vitality={appearance.vitality}
            starterPrompts={starterPrompts as string[]}
            appearance={appearance}
            bottomRef={bottomRef}
            isHydratingHistory={!historyLoaded && totalMessages > 0 && messages.length === 0}
            isPlaying={isPlaying}
            copiedIndex={copiedIndex}
            verbal={verbal}
            onPromptClick={(prompt) => {
              if (!isStreaming) {
                void sendMessage(prompt, { source: "prompt", locale, totalMessages });
              }
            }}
            onSpeak={speak}
            onStop={stop}
            onCopy={(index, content) => void handleCopy(index, content)}
            onRetry={retryLastMessage}
            t={t}
          />
        </div>

        {/* Silent mode — verbal < 0.15: touch interaction instead of text */}
        {isSilentMode && (
          <div className="mx-auto mb-4 max-w-3xl text-center">
            <p className="text-xs text-white/25 mb-3">{t("chat.silentMode") || "말이 없는 존재예요. 터치로 교감해요."}</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {["쓰다듬기", "두드리기", "흔들기", "가만히 있기"].map((action) => (
                <motion.button
                  key={action}
                  type="button"
                  onClick={() => handleSilentTouch(`[${action}]`)}
                  disabled={isStreaming}
                  whileTap={{ scale: 0.92 }}
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-white/60 hover:border-white/30 hover:text-white/90 transition-all disabled:opacity-40"
                >
                  {action}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Anonymous signup nudge — shown after 5 messages */}
        {isAnonymous && totalMessages >= 5 && !signupBannerDismissed && (
          <div className="mx-auto mb-3 max-w-3xl rounded-2xl border border-cyan-400/25 bg-cyan-400/8 px-4 py-3 flex items-center justify-between gap-3 backdrop-blur-sm">
            <p className="text-sm text-cyan-100/80 leading-snug">
              {t("chat.signupNudge") || "계속 대화하려면 계정을 만드세요. 진화 기록이 저장됩니다."}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/login"
                className="rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-300 transition-colors"
              >
                {t("common.signUp") || "가입하기"}
              </Link>
              <button
                type="button"
                onClick={() => setSignupBannerDismissed(true)}
                className="text-white/40 hover:text-white/70 transition-colors text-xs"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="shrink-0 pt-3">
          <MessageInput
            input={input}
            setInput={setInput}
            isStreaming={isStreaming}
            placeholder={placeholder}
            appearance={appearance}
            onSubmit={handleSubmit}
            voiceState={voiceInput.state}
            voiceError={voiceInput.error}
            onVoiceToggle={voiceInput.toggle}
            onStopStreaming={stopStreaming}
            t={t}
          />

          <p className="mt-2 text-center text-sm text-white/78">
            {isFirstSession
              ? t("chat.firstFootnote")
              : t("chat.returningFootnote")}
          </p>
          <p className="sr-only" aria-live="polite">
            {isStreaming ? t("chat.responding") : t("chat.waiting")}
          </p>
        </div>
      </div>
    </div>
  );
}


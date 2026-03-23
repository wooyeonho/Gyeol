"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";
import { createClient } from "@/lib/supabase/client";

import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { createClient } from "@/lib/supabase/client";
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
  const [signupDismissed, setSignupDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkAnon() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user?.is_anonymous) setIsAnonymous(true);
      } catch { /* ignore */ }
    }
    void checkAnon();
    return () => { cancelled = true; };
  }, []);

  const [isAnonymous, setIsAnonymous] = useState(false);
  useEffect(() => {
    let cancelled = false;
    createClient().auth.getUser().then(({ data }) => {
      if (!cancelled && data.user?.is_anonymous) setIsAnonymous(true);
    });
    return () => { cancelled = true; };
  }, []);

  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
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

        {/* Guest signup banner: show after 5+ messages for anonymous users */}
        {isAnonymous && totalMessages >= 5 && !signupDismissed && (
          <div className="shrink-0 mx-auto w-full max-w-sm mb-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-md px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-white/90">{t("chat.signupBannerTitle")}</p>
                <p className="text-xs text-white/50 mt-0.5">{t("chat.signupBannerBody")}</p>
              </div>
              <a
                href="/auth/signup"
                className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
              >
                {t("chat.signupBannerCta")}
              </a>
              <button
                type="button"
                onClick={() => setSignupDismissed(true)}
                className="shrink-0 text-white/30 hover:text-white/60 transition-colors text-xs"
                aria-label={t("common.close")}
              >
                &#x2715;
              </button>
            </div>
          </div>
        )}

        <div className="shrink-0 pt-3">
          {isAnonymous && totalMessages >= 5 && (
            <div className="mb-3 mx-auto max-w-sm rounded-xl border border-cyan-400/20 bg-cyan-400/5 backdrop-blur-md px-4 py-3 text-center">
              <p className="text-sm text-white/80">
                {t("chat.guestSignupPrompt")}
              </p>
              <a
                href="/settings"
                className="mt-2 inline-block rounded-full bg-cyan-500/20 px-4 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/30 transition-colors"
              >
                {t("chat.guestSignupCta")}
              </a>
            </div>
          )}
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


"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";

import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTTS } from "@/hooks/use-tts";
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
  const { messages, isStreaming, sendMessage, pendingUsageMode, retryLastMessage } = useChatStore();
  const agentState = useAgentStore((state) => state.agentState);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
    },
    locale
  );

  const { speak, stop, isPlaying } = useTTS({
    pitch: appearance.voice.pitch,
    speed: appearance.voice.speed,
    tremor: appearance.voice.tremor,
    lang: t("chat.langCode"),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed, { source: "input" });
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
    <div className={`fixed inset-0 z-10 flex flex-col justify-end px-4 ${navVisible ? "pb-24" : "pb-6"}`}>
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        isFirstSession={isFirstSession}
        firstSessionConfig={firstSessionConfig}
        vitality={appearance.vitality}
        starterPrompts={starterPrompts as string[]}
        appearance={appearance}
        bottomRef={bottomRef}
        isPlaying={isPlaying}
        copiedIndex={copiedIndex}
        onPromptClick={(prompt) => {
          if (!isStreaming) {
            void sendMessage(prompt, { source: "prompt" });
          }
        }}
        onSpeak={speak}
        onStop={stop}
        onCopy={(index, content) => void handleCopy(index, content)}
        onRetry={retryLastMessage}
        t={t}
      />

      <MessageInput
        input={input}
        setInput={setInput}
        isStreaming={isStreaming}
        placeholder={placeholder}
        appearance={appearance}
        onSubmit={handleSubmit}
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
  );
}


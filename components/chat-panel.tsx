"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTTS } from "@/hooks/use-tts";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";

function getFirstSessionConfig(locale: "ko" | "en") {
  return locale === "en"
    ? {
        heading: "Start in one short message",
        helper: "Say hello, share how you feel, or ask for help with one problem. Gyeol will learn your tone after the conversation starts.",
        placeholder: "Say hi or tell Gyeol what you need today",
        prompts: [
          "Hi, can you start with three easy questions?",
          "Help me sort the one thing that feels hardest today.",
          "I just want a calm conversation for a minute.",
        ],
      }
    : {
        heading: "짧은 한 문장으로 시작하세요",
        helper: "인사, 지금 기분, 오늘 정리하고 싶은 문제 하나만 말해도 충분합니다. 결은 대화가 시작된 뒤에 당신의 톤을 배워갑니다.",
        placeholder: "안녕이라고 말하거나 오늘 필요한 걸 적어보세요",
        prompts: [
          "안녕, 시작하기 쉬운 질문 3개만 해줘.",
          "오늘 가장 막히는 문제 하나만 같이 정리해줘.",
          "그냥 1분만 차분하게 대화하고 싶어.",
        ],
      };
}

function getReturningPrompts(locale: "ko" | "en") {
  return locale === "en"
    ? [
        "Tell me the one thing I should focus on today.",
        "Summarize how my mood looks right now.",
        "Build a short action plan from my current state.",
      ]
    : [
        "오늘 내가 집중해야 할 1가지만 알려줘.",
        "지금 내 상태를 짧게 정리해줘.",
        "현재 상태를 바탕으로 짧은 실행 계획을 만들어줘.",
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
  const firstSessionConfig = getFirstSessionConfig(locale);
  const starterPrompts = isFirstSession ? firstSessionConfig.prompts : getReturningPrompts(locale);
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
    lang: locale === "ko" ? "ko-KR" : "en-US",
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
        locale={locale}
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


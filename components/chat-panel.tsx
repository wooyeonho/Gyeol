"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";
import { EXPERIMENT } from "@/lib/experiments/catalog";
import { useFirstMessageOnboardingVariant } from "@/lib/experiments/client";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

function getFirstSessionVariants(locale: "ko" | "en") {
  if (locale === "en") {
    return {
      identity: {
        heading: "A short first message is enough",
        helper: "You do not need a long introduction. A single line about how you feel or what matters today is enough for Gyeol to store its first memory.",
        placeholder: "Leave a short greeting or your current mood",
        prompts: [
          "Say hello and ask how Gyeol should remember me from today.",
          "Help me write one sentence that describes who I am right now.",
          "Ask me three first questions so we can get to know each other.",
        ],
      },
      productivity: {
        heading: "You can start by naming today’s problem",
        helper: "You do not need a long explanation. Drop the one thing that feels blocked right now and let Gyeol help you shape the first action.",
        placeholder: "Write the one problem you want to sort out first",
        prompts: [
          "Help me define the single problem I should solve first today.",
          "Make a 15-minute action plan from my current state.",
          "Set my top three priorities right now.",
        ],
      },
    } as const;
  }
  return {
    identity: {
      heading: "첫 대화는 짧아도 충분합니다",
      helper: "자기소개를 길게 할 필요는 없습니다. 지금의 기분, 오늘의 목표, 혹은 한 줄의 인사만 보내도 결은 그 순간을 첫 기억으로 남깁니다.",
      placeholder: "첫 인사나 지금의 기분을 한 줄로 남겨보세요",
      prompts: [
        "안녕, 오늘의 나를 어떻게 기억하면 좋을지 물어봐줘.",
        "지금의 나를 설명하는 첫 문장을 같이 만들자.",
        "우리가 서로를 알아가기 위한 첫 질문을 해줘.",
      ],
    },
    productivity: {
      heading: "오늘의 문제를 바로 정리해도 좋습니다",
      helper: "긴 설명 없이 지금 가장 막히는 일 하나만 적어도 됩니다. 결은 바로 실행 가능한 첫 정리를 도와줄 수 있습니다.",
      placeholder: "지금 가장 먼저 정리해야 할 문제를 적어보세요",
      prompts: [
        "오늘 가장 먼저 정리해야 할 문제를 같이 정리해줘.",
        "내 상태를 보고 바로 실행 가능한 15분 플랜을 짜줘.",
        "지금 우선순위 3개를 빠르게 정해줘.",
      ],
    },
  } as const;
}

function getReturningPrompts(locale: "ko" | "en") {
  return locale === "en"
    ? [
        "Tell me the one thing I should focus on today.",
        "Recommend three routines that would improve my mood.",
        "Build an action plan from how I feel right now.",
      ]
    : [
        "오늘 내가 집중해야 할 1가지만 알려줘.",
        "기분이 좋아지는 루틴을 3개 추천해줘.",
        "지금 상태를 바탕으로 실행 계획을 만들어줘.",
      ];
}

export function ChatPanel() {
  const { locale, t } = useTranslations();
  const { messages, isStreaming, sendMessage, pendingUsageMode } = useChatStore();
  const agentState = useAgentStore((state) => state.agentState);
  const onboardingVariant = useFirstMessageOnboardingVariant();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
  const isFirstSession = totalMessages === 0 && messages.length === 0;
  const firstSessionConfig = getFirstSessionVariants(locale)[onboardingVariant];
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed, { source: "input" });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !isStreaming) {
        sendMessage(trimmed, { source: "input" });
        setInput("");
      }
    }
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
    <div className="fixed inset-0 z-10 flex flex-col justify-end pb-24 px-4">
      <div
        className="flex-1 overflow-y-auto space-y-4 py-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="채팅 메시지"
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-2xl pt-20">
            <div className="rounded-3xl border border-white/10 bg-black/35 p-5 text-center">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/65">
                {isFirstSession ? t("chat.firstMessage") : t("chat.todayCheckIn")}
              </p>
              <h2 className="mt-3 text-xl font-semibold">
                {isFirstSession ? firstSessionConfig.heading : t("chat.returningHeading")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {isFirstSession
                  ? firstSessionConfig.helper
                  : t("chat.returningHelper")}
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: appearance.palette.primary }}>
                {appearance.voice.accentLabel}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      if (!isStreaming) {
                        void sendMessage(prompt, {
                          experiment_key: EXPERIMENT.firstMessageOnboarding,
                          experiment_variant: onboardingVariant,
                          source: "prompt",
                        });
                      }
                    }}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                    disabled={isStreaming}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/45">
                {isFirstSession
                  ? t("chat.firstMessageHint")
                  : t("chat.returningHint")}
              </p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "user" ? (
              <div className="bg-white/10 rounded-2xl px-4 py-2 max-w-[80%]">
                {m.content}
              </div>
            ) : (
              <div
                className="max-w-[80%] rounded-2xl border bg-black/35 px-4 py-2"
                style={{
                  borderColor: `${appearance.palette.primary}35`,
                  boxShadow: `0 0 0 1px ${appearance.palette.primary}12 inset`,
                }}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                  {isStreaming && i === messages.length - 1 && (
                    <span className="animate-pulse" style={{ color: appearance.palette.primary }}>|</span>
                  )}
                </p>
                {!isStreaming && i === messages.length - 1 && (
                  <p className="mt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {appearance.voice.toneHint}
                  </p>
                )}
                {!isStreaming && m.content && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCopy(i, m.content)}
                      className="text-[11px] text-white/50 hover:text-white/80"
                    >
                      {copiedIndex === i ? t("chat.copied") : t("chat.copy")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          채팅 입력
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isStreaming}
          className="flex-1 rounded-full bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none disabled:opacity-50"
          style={{ boxShadow: `0 0 0 1px ${appearance.palette.primary}20 inset` }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="px-4 py-3 rounded-full text-white disabled:opacity-50"
          style={{ background: `${appearance.palette.primary}28` }}
        >
          {t("chat.send")}
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-white/40">
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


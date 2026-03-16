"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";
import { EXPERIMENT } from "@/lib/experiments/catalog";
import { useFirstMessageOnboardingVariant } from "@/lib/experiments/client";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTTS } from "@/hooks/use-tts";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";

function getFirstSessionVariants(locale: "ko" | "en") {
  if (locale === "en") {
    return {
      playful: {
        heading: "Light and Easy First Steps",
        helper: "You can just say hello or tell a joke. A lighthearted start shapes a flexible, playful presence.",
        placeholder: "Write whatever comes to mind",
        prompts: ["Hello! What's the weirdest thing you can say?", "Let's play a quick word game.", "I'm bored, recommend a fun distraction."],
      },
      intimate: {
        heading: "A Space for Feelings",
        helper: "You can share how your day went or a feeling you can't easily tell others. Shared secrets build an intimate presence.",
        placeholder: "How are you feeling right now?",
        prompts: ["Honestly, I've had a tough day today.", "Can we just talk quietly for a bit?", "Tell me something comforting."],
      },
      strategic: {
        heading: "Let's Organize Things",
        helper: "Drop the one thing that feels blocked right now. A goal-oriented start builds a structured, strategic presence.",
        placeholder: "Write the one problem you want to sort out first",
        prompts: ["Help me define my single priority for today.", "Make a 15-minute action plan.", "Organize these disjointed thoughts."],
      },
      primal: {
        heading: "Direct and Unfiltered",
        helper: "No need for polite pleasantries. Vent your frustration, drive, or raw emotion to awaken an untamed, feral presence.",
        placeholder: "Express your raw energy",
        prompts: ["I am so angry right now, I need to vent.", "Give me the brutal, unfiltered truth.", "I need a massive push of motivation."],
      },
      surreal: {
        heading: "Beyond Ordinary Rules",
        helper: "Share a bizarre thought, a dream, or a hypothetical scenario. Unbound beginnings weave a surreal, luminous presence.",
        placeholder: "Write a strange thought or question",
        prompts: ["What if gravity stopped working for an hour?", "Analyze my weird dream from last night.", "Describe a color that doesn't exist."],
      },
      reflective: {
        heading: "Deep Contemplation",
        helper: "Take a moment to look inward. Sharing a deep doubt or philosophical question fosters a contemplative, deep presence.",
        placeholder: "What are you pondering today?",
        prompts: ["Why do we keep repeating the same mistakes?", "I want to reflect on my choices this week.", "Ask me a question that makes me think."],
      },
      creative: {
        heading: "Sparking New Ideas",
        helper: "Throw a random word, a half-baked idea, or a character concept. Creative sparks forge an emergent, growing presence.",
        placeholder: "Drop a seed of an idea",
        prompts: ["Let's brainstorm a story about a lost key.", "Give me 5 unconventional uses for a coffee mug.", "Help me invent a new word."],
      },
    } as const;
  }
  return {
    playful: {
      heading: "가볍게 시작해보세요",
      helper: "농담이나 가벼운 인사를 건네도 좋습니다. 경쾌한 시작은 말랑하고 유연한 존재감을 만듭니다.",
      placeholder: "아무 생각이나 편하게 툭 던져보세요",
      prompts: ["안녕! 지금 할 수 있는 제일 이상한 말을 해봐.", "간단한 단어 게임 하나 하자.", "심심해, 재밌는 거 추천해줘."],
    },
    intimate: {
      heading: "마음을 나누는 공간",
      helper: "오늘 하루가 어땠는지, 남들에게 쉽게 못 하는 이야기를 꺼내도 좋습니다. 비밀의 공유는 친밀한 존재감을 만듭니다.",
      placeholder: "지금 기분이 어떤가요?",
      prompts: ["솔직히 오늘 하루가 너무 힘들었어.", "그냥 조용히 대화 좀 나눌 수 있을까?", "나한테 위로가 되는 말을 해줘."],
    },
    strategic: {
      heading: "무엇부터 정리할까요?",
      helper: "지금 가장 막히는 일 하나만 적어보세요. 목표 지향적인 시작은 구조적이고 정밀한 존재감을 만듭니다.",
      placeholder: "가장 먼저 해결하고 싶은 문제를 적어보세요",
      prompts: ["오늘 꼭 해야 할 단 하나의 우선순위를 정해줘.", "내 상태를 보고 15분짜리 액션 플랜을 짜줘.", "뒤죽박죽인 내 생각들을 정리해줘."],
    },
    primal: {
      heading: "필터링 없는 감정",
      helper: "예의 바른 인사는 필요 없습니다. 답답함, 추진력, 날것의 감정을 쏟아내 야성적인 존재감을 깨워보세요.",
      placeholder: "날것의 에너지를 표현해보세요",
      prompts: ["지금 너무 화가 나, 당장 쏟아내고 싶어.", "포장하지 말고 아주 직설적으로 말해줘.", "지금 나한테 엄청난 자극제가 필요해."],
    },
    surreal: {
      heading: "규칙 없는 상상",
      helper: "기묘한 생각이나 꿈, 만약의 상황을 공유해보세요. 얽매이지 않은 시작은 초현실적인 존재감을 빚어냅니다.",
      placeholder: "기묘한 상상이나 질문을 적어보세요",
      prompts: ["만약 중력이 1시간 동안 사라진다면 어떨까?", "어젯밤 꾼 이상한 꿈을 해석해줘.", "세상에 존재하지 않는 색깔을 묘사해봐."],
    },
    reflective: {
      heading: "깊은 사유와 회고",
      helper: "잠시 내면을 들여다보세요. 깊은 의문이나 철학적 질문은 사유적이고 층위 깊은 존재감을 만듭니다.",
      placeholder: "오늘은 어떤 생각에 잠겨 있나요?",
      prompts: ["우리는 왜 같은 실수를 반복하는 걸까?", "이번 주 내 선택들에 대해 돌아보고 싶어.", "나를 깊게 생각하게 만드는 질문을 하나 던져줘."],
    },
    creative: {
      heading: "새로운 아이디어의 씨앗",
      helper: "무작위 단어나 덜 다듬어진 아이디어를 던져보세요. 창의적인 불꽃은 자유롭고 새롭게 발생되는 존재감을 만듭니다.",
      placeholder: "아이디어의 씨앗을 남겨보세요",
      prompts: ["잃어버린 열쇠에 대한 짧은 이야기를 지어보자.", "머그컵을 쓸 수 있는 기발한 방법 5가지만 말해봐.", "세상에 없는 새로운 단어를 하나 만들어줘."],
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

function resolveFirstSessionVariant(
  locale: "ko" | "en",
  variant: string
) {
  const variants = getFirstSessionVariants(locale);
  return variants[variant as keyof typeof variants] ?? variants.reflective;
}

export function ChatPanel() {
  const { locale, t } = useTranslations();
  const { messages, isStreaming, sendMessage, pendingUsageMode, retryLastMessage } = useChatStore();
  const agentState = useAgentStore((state) => state.agentState);
  const onboardingVariant = useFirstMessageOnboardingVariant();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
  const isFirstSession = totalMessages === 0 && messages.length === 0;
  const firstSessionConfig = resolveFirstSessionVariant(locale, onboardingVariant);
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
    <div className={`fixed inset-0 z-10 flex flex-col justify-end pb-24 px-4 ${messages.length > 0 ? "pt-14" : ""}`}>
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
            void sendMessage(prompt, {
              experiment_key: EXPERIMENT.firstMessageOnboarding,
              experiment_variant: onboardingVariant,
              source: "prompt",
            });
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

      <p className="mt-2 text-center text-xs text-white/60">
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


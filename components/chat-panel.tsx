"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";
import { EXPERIMENT } from "@/lib/experiments/catalog";
import { useFirstMessageOnboardingVariant } from "@/lib/experiments/client";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTTS } from "@/hooks/use-tts";

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

  const { speak, stop, isPlaying } = useTTS({
    pitch: appearance.voice.pitch,
    speed: appearance.voice.speed,
    tremor: appearance.voice.tremor,
    lang: locale === "ko" ? "ko-KR" : "en-US",
  });

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
                {isFirstSession 
                  ? t("chat.firstMessage") 
                  : appearance.vitality < 0.3 
                    ? (locale === "ko" ? "희미해진 연결" : "Fading Connection") 
                    : t("chat.todayCheckIn")}
              </p>
              <h2 className="mt-3 text-xl font-semibold">
                {isFirstSession 
                  ? firstSessionConfig.heading 
                  : appearance.vitality < 0.3 
                    ? (locale === "ko" ? "당신이 오지 않아 온기가 사라졌어요..." : "The warmth faded without you...") 
                    : t("chat.returningHeading")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {isFirstSession
                  ? firstSessionConfig.helper
                  : appearance.vitality < 0.3 
                    ? (locale === "ko" ? "결의 모습이 흐릿해지고 있습니다. 지금 바로 말을 걸어 생명력(Vitality)을 다시 채워주세요." : "The presence is fading. Speak to it now to restore its Vitality and color.")
                    : t("chat.returningHelper")}
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: appearance.palette.primary }}>
                {appearance.voice.accentLabel}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {starterPrompts.map((prompt: string) => (
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
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlaying) stop();
                        else speak(m.content);
                      }}
                      className="text-[11px] text-white/50 hover:text-white/80"
                    >
                      {isPlaying ? "정지" : "듣기"}
                    </button>
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


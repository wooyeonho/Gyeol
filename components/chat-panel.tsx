"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";

const FIRST_SESSION_PROMPTS = [
  "안녕, 오늘의 나를 어떻게 기억하면 좋을지 물어봐줘.",
  "지금의 나를 설명하는 첫 문장을 같이 만들자.",
  "우리가 서로를 알아가기 위한 첫 질문을 해줘.",
];

const RETURNING_PROMPTS = [
  "오늘 내가 집중해야 할 1가지만 알려줘.",
  "기분이 좋아지는 루틴을 3개 추천해줘.",
  "지금 상태를 바탕으로 실행 계획을 만들어줘.",
];

export function ChatPanel() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const agentState = useAgentStore((state) => state.agentState);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const isFirstSession = totalMessages === 0 && messages.length === 0;
  const starterPrompts = isFirstSession ? FIRST_SESSION_PROMPTS : RETURNING_PROMPTS;
  const placeholder = isFirstSession ? "첫 인사나 지금의 기분을 한 줄로 남겨보세요" : "오늘의 생각이나 감정을 이어서 말해보세요";

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
                {isFirstSession ? "FIRST MESSAGE" : "TODAY'S CHECK-IN"}
              </p>
              <h2 className="mt-3 text-xl font-semibold">
                {isFirstSession ? "첫 대화는 짧아도 충분합니다" : "오늘은 어떤 이야기로 시작할까요?"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {isFirstSession
                  ? "자기소개를 길게 할 필요는 없습니다. 지금의 기분, 오늘의 목표, 혹은 한 줄의 인사만 보내도 결은 그 순간을 첫 기억으로 남깁니다."
                  : "지금 상태, 오늘의 목표, 또는 어제와 달라진 점 하나만 꺼내도 오늘의 대화가 자연스럽게 이어집니다."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      if (!isStreaming) void sendMessage(prompt, { source: "prompt" });
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
                  ? "첫 메시지 후에는 기억과 상태 변화가 누적되기 시작합니다."
                  : "대화는 활동과 앨범, 성장 흐름으로 이어집니다."}
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
              <div className="max-w-[80%] rounded-2xl border border-white/10 bg-black/35 px-4 py-2">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                  {isStreaming && i === messages.length - 1 && (
                    <span className="animate-pulse">|</span>
                  )}
                </p>
                {!isStreaming && m.content && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCopy(i, m.content)}
                      className="text-[11px] text-white/50 hover:text-white/80"
                    >
                      {copiedIndex === i ? "복사됨" : "복사"}
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
          className="flex-1 bg-white/5 rounded-full px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="px-4 py-3 rounded-full bg-white/10 text-white disabled:opacity-50"
        >
          전송
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-white/40">
        {isFirstSession
          ? "첫 시작은 한 문장으로 충분합니다. 중요한 건 길이보다 시작입니다."
          : "짧은 체크인도 괜찮습니다. 결은 작은 변화도 기억하려고 합니다."}
      </p>
      <p className="sr-only" aria-live="polite">
        {isStreaming ? "응답 생성 중입니다." : "응답 대기 중입니다."}
      </p>
    </div>
  );
}


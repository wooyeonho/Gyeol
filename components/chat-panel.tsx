"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";

const STARTER_PROMPTS = [
  "오늘 내가 집중해야 할 1가지만 알려줘.",
  "기분이 좋아지는 루틴을 3개 추천해줘.",
  "지금 상태를 바탕으로 실행 계획을 만들어줘.",
];

export function ChatPanel() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !isStreaming) {
        sendMessage(trimmed);
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
          <div className="max-w-2xl mx-auto pt-20 space-y-3">
            <p className="text-center text-sm text-white/55">바로 시작해볼까요?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (!isStreaming) void sendMessage(prompt);
                  }}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                  disabled={isStreaming}
                >
                  {prompt}
                </button>
              ))}
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
          placeholder="무엇이든 말해봐..."
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
      <p className="sr-only" aria-live="polite">
        {isStreaming ? "응답 생성 중입니다." : "응답 대기 중입니다."}
      </p>
    </div>
  );
}


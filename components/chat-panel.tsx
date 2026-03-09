"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";

const STARTER_PROMPTS = [
  "오늘 너는 어떤 기분이야?",
  "지금 네가 가장 궁금한 건 뭐야?",
  "우리 관계를 한 문장으로 표현해줘.",
  "방금 떠오른 기억 하나를 들려줘.",
];

export function ChatPanel() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

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

  const handlePromptClick = (prompt: string) => {
    if (isStreaming) return;
    void sendMessage(prompt);
    setInput("");
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end pb-24 px-4">
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && (
          <section className="mx-auto mb-6 max-w-xl rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-md">
            <p className="text-sm font-medium text-white">대화를 시작해 보세요</p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              존재의 감정, 기억, 관계, 세계에 대해 물으면 가장 좋은 경험이 시작됩니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  disabled={isStreaming}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        )}

        <div
          role="log"
          aria-label="대화 기록"
          aria-live="polite"
          aria-busy={isStreaming}
          className="space-y-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[80%] rounded-2xl bg-black/20 px-3 py-2 text-white/92">
                  {m.content}
                  {isStreaming && i === messages.length - 1 && (
                    <span className="animate-pulse" aria-hidden="true">
                      |
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2" aria-label="메시지 입력 폼">
        <label htmlFor="chat-input" className="sr-only">
          존재에게 보낼 메시지
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="무엇이든 말해봐..."
          disabled={isStreaming}
          autoComplete="off"
          aria-describedby="chat-input-help"
          className="flex-1 bg-white/5 rounded-full px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
        />
        <span id="chat-input-help" className="sr-only">
          메시지를 입력하고 엔터 키 또는 전송 버튼으로 보낼 수 있습니다.
        </span>
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="메시지 전송"
          className="px-4 py-3 rounded-full bg-white/10 text-white disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}


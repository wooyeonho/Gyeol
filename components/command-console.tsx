"use client";

import { useMemo, useState } from "react";
import { useChatStore } from "@/store/chat-store";

const STARTER_PROMPTS = [
  "지금 열린 루프를 우선순위 순으로 정리해줘.",
  "관계 흐름과 해야 할 일을 같이 묶어서 브리핑해줘.",
  "오늘 밤 어떤 장면이 생길지 예상해서 다음 액션을 추천해줘.",
];

export function CommandConsole() {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const [input, setInput] = useState("");

  const visibleMessages = useMemo(() => messages.slice(-4), [messages]);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#0c1018] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/55">AI Core</p>
          <h2 className="mt-2 text-xl font-medium">Command Console</h2>
          <p className="mt-2 text-sm text-white/62">
            약속, 관계, 스토리, 월드 상태를 한 문장으로 던지면 결이 지금 필요한 실행안을 바로 제안합니다.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          {isStreaming ? "응답 중" : "대기 중"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              if (!isStreaming) void sendMessage(prompt);
            }}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78 hover:bg-white/10"
            disabled={isStreaming}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {visibleMessages.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
            아직 대화가 없습니다. 위 제안 프롬프트로 시작하거나 원하는 방식으로 질문하세요.
          </div>
        ) : (
          visibleMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}-${message.content.slice(0, 20)}`}
              className={`rounded-2xl p-3 text-sm leading-6 ${
                message.role === "user"
                  ? "border border-white/10 bg-white/8 text-white/88"
                  : "border border-cyan-300/12 bg-cyan-400/[0.04] text-white/82"
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                {message.role === "user" ? "당신" : "결"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">
                {message.content}
                {isStreaming && index === visibleMessages.length - 1 && message.role === "assistant" && (
                  <span className="animate-pulse">|</span>
                )}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && input.trim() && !isStreaming) {
              void sendMessage(input.trim());
              setInput("");
            }
          }}
          placeholder="예: 민지랑 소라 관련 열린 루프를 묶어서 오늘 우선순위 정리해줘"
          disabled={isStreaming}
          className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-cyan-300/25"
        />
        <button
          type="button"
          onClick={() => {
            if (!input.trim() || isStreaming) return;
            void sendMessage(input.trim());
            setInput("");
          }}
          className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
          disabled={!input.trim() || isStreaming}
        >
          실행
        </button>
      </div>
    </section>
  );
}

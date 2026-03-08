"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";

export function ChatPanel() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="fixed inset-0 z-10 flex flex-col pointer-events-none">
      {/* Messages area */}
      <div
        ref={listRef}
        className={`flex-1 overflow-y-auto scrollbar-hide pointer-events-auto transition-opacity duration-500 ${
          hasMessages ? "opacity-100" : "opacity-0"
        }`}
        style={{ paddingTop: "4rem", paddingBottom: "8rem", paddingLeft: "1rem", paddingRight: "1rem" }}
      >
        <div className="max-w-lg mx-auto space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "user" ? (
                <div
                  className="px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed max-w-[78%]"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  className="px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed max-w-[82%] text-white/85"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {m.content}
                  {isStreaming && i === messages.length - 1 && (
                    <span className="inline-block w-0.5 h-3.5 bg-white/50 ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Input area */}
      <div
        className="pointer-events-auto"
        style={{
          padding: "0 1rem",
          paddingBottom: `max(1.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))`,
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto"
        >
          <div
            className={`flex items-center gap-2 rounded-2xl transition-all duration-300 ${
              isFocused
                ? "bg-white/10 border border-white/20 shadow-lg shadow-black/30"
                : "bg-black/40 border border-white/8"
            }`}
            style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isStreaming ? "..." : "무엇이든 말해봐"}
              disabled={isStreaming}
              autoComplete="off"
              className="flex-1 bg-transparent px-4 py-3.5 text-white text-sm placeholder-white/25 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className={`mr-1.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                input.trim() && !isStreaming
                  ? "bg-white/20 hover:bg-white/30 opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";

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

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end pb-24 px-4">
      <div className="flex-1 overflow-y-auto space-y-4 py-4">
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
              <div className="max-w-[80%]">
                {m.content}
                {isStreaming && i === messages.length - 1 && (
                  <span className="animate-pulse">|</span>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
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
    </div>
  );
}


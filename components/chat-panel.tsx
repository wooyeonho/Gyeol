"use client";

import { useRef, useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAgentStore } from "@/store/agent-store";

export default function ChatPanel() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const fetchAgentState = useAgentStore((s) => s.fetchAgentState);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming) fetchAgentState();
  }, [isStreaming, fetchAgentState]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const el = inputRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text || isStreaming) return;
    sendMessage(text);
    el.value = "";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  async function handleInputBlur() {
    const el = inputRef.current;
    if (!el || isStreaming) return;
    const hadContent = el.value.trim().length > 0;
    try {
      await fetch("/api/agent/typing-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "blur", had_content: hadContent }),
      });
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                m.role === "user"
                  ? "bg-white/10 rounded-2xl px-4 py-2 max-w-[85%]"
                  : "text-left max-w-[85%]"
              }
            >
              {m.content}
              {m.role === "assistant" && i === messages.length - 1 && isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-white/80 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="bg-white/5 rounded-full flex items-end gap-2 p-2">
          <textarea
            ref={inputRef}
            placeholder="Say anything..."
            rows={1}
            disabled={isStreaming}
            onKeyDown={onKeyDown}
            onBlur={handleInputBlur}
            className="flex-1 bg-transparent text-white placeholder:text-white/40 resize-none outline-none px-4 py-2 disabled:opacity-50 min-h-[44px] max-h-32"
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

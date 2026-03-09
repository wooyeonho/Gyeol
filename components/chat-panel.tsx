"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="fixed inset-0 z-10 flex flex-col justify-end pb-28 px-4 pt-20">
      <div className="flex-1 overflow-y-auto space-y-5 py-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-4 py-2.5 shadow-lg">
                  <p className="text-[15px] leading-relaxed text-[var(--foreground)]">{m.content}</p>
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl px-1">
                  <p className="text-[15px] leading-relaxed text-[var(--muted-strong)]">
                    {m.content}
                    {isStreaming && i === messages.length - 1 && (
                      <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-[var(--accent)]/60 animate-pulse" />
                    )}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="flex gap-3 items-end"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="무엇이든 말해봐..."
            disabled={isStreaming}
            className="w-full rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-5 py-3.5 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--border-strong)] focus:outline-none disabled:opacity-50 transition-colors duration-200"
          />
        </div>
        <motion.button
          type="submit"
          disabled={isStreaming || !input.trim()}
          whileTap={{ scale: 0.96 }}
          className="rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-[15px] font-medium text-[var(--background)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
        >
          전송
        </motion.button>
      </motion.form>
    </div>
  );
}

"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chat-store";

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/40"
            style={{
              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  isLast,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "msg-user rounded-br-sm text-white"
            : "msg-agent rounded-bl-sm text-white/90"
        }`}
        style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}
      >
        {content}
        {isStreaming && isLast && !isUser && (
          <span
            className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 align-text-bottom"
            style={{ animation: "glow-pulse 0.8s ease-in-out infinite" }}
          />
        )}
      </div>
    </motion.div>
  );
}

export function ChatPanel() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;
      sendMessage(trimmed);
      setInput("");
    },
    [input, isStreaming, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmed = input.trim();
        if (trimmed && !isStreaming) {
          sendMessage(trimmed);
          setInput("");
        }
      }
    },
    [input, isStreaming, sendMessage]
  );

  const canSend = input.trim().length > 0 && !isStreaming;

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end pointer-events-none">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 pointer-events-auto pb-2">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role as "user" | "assistant"}
              content={m.content}
              isLast={i === messages.length - 1}
              isStreaming={isStreaming}
            />
          ))}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input bar */}
      <div
        className="mx-3 mb-[calc(72px+env(safe-area-inset-bottom))] pointer-events-auto"
      >
        <motion.div
          animate={{
            boxShadow: focused
              ? "0 0 0 1px rgba(124,58,237,0.5), 0 8px 32px rgba(0,0,0,0.4)"
              : "0 4px 24px rgba(0,0,0,0.3)",
          }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(10, 10, 15, 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: focused
              ? "1px solid rgba(124,58,237,0.4)"
              : "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="무엇이든 말해봐..."
              disabled={isStreaming}
              autoComplete="off"
              className="flex-1 bg-transparent text-white placeholder-white/25 focus:outline-none text-sm py-2 disabled:opacity-40"
            />

            <motion.button
              type="submit"
              disabled={!canSend}
              whileTap={{ scale: 0.88 }}
              animate={{
                opacity: canSend ? 1 : 0.3,
                scale: canSend ? 1 : 0.95,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 disabled:pointer-events-none"
              style={{
                background: canSend
                  ? "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
                  : "rgba(255,255,255,0.08)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

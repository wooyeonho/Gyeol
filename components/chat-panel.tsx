"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import { motion, AnimatePresence } from "framer-motion";

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/50"
          style={{
            animation: "dot-pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}

export function ChatPanel() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = input.trim().length > 0;

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end pb-[88px] pointer-events-none">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pointer-events-auto">
        <div className="max-w-2xl mx-auto space-y-3">
          <AnimatePresence mode="popLayout">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "user" ? (
                  <div className="glass-strong rounded-[20px] rounded-br-md px-4 py-2.5 max-w-[80%] text-[15px] leading-relaxed text-white/90">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[85%] text-[15px] leading-relaxed text-white/80">
                    {m.content}
                    {isStreaming && i === messages.length - 1 && !m.content && (
                      <TypingDots />
                    )}
                    {isStreaming && i === messages.length - 1 && m.content && (
                      <span className="inline-block w-0.5 h-4 bg-white/60 ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="pointer-events-auto px-4 pb-2">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="glass-strong rounded-2xl flex items-end gap-2 px-4 py-2.5 transition-all duration-200 focus-within:border-white/20"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="무엇이든 말해봐..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-transparent text-[15px] text-white placeholder-white/30 focus:outline-none disabled:opacity-40 resize-none leading-relaxed py-0.5 no-scrollbar"
              style={{ maxHeight: "120px" }}
            />
            <button
              type="submit"
              disabled={isStreaming || !hasContent}
              className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                transition-all duration-200
                ${hasContent && !isStreaming
                  ? "bg-accent text-white scale-100 opacity-100"
                  : "bg-white/5 text-white/20 scale-90 opacity-60"
                }
              `}
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

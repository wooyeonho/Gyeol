import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { haptic, playSound } from "@/lib/micro-interactions";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

export function MessageInput({
  input,
  setInput,
  isStreaming,
  placeholder,
  appearance,
  onSubmit,
  t,
}: {
  input: string;
  setInput: (value: string) => void;
  isStreaming: boolean;
  placeholder: string;
  appearance: ResolvedIdentityAppearance;
  onSubmit: (e: React.FormEvent | React.KeyboardEvent) => void;
  t: (key: string) => string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitWithFeedback(e);
    }
  };

  const handleSubmitWithFeedback = (e: React.FormEvent | React.KeyboardEvent) => {
    if (!input.trim() || isStreaming) {
      onSubmit(e);
      return;
    }
    haptic("send");
    playSound("send");
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmitWithFeedback} className="mx-auto flex w-full max-w-4xl gap-3">
      <label htmlFor="chat-input" className="sr-only">
        {t("chat.inputLabel")}
      </label>
      <input
        id="chat-input"
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isStreaming}
        className="min-h-12 flex-1 rounded-2xl bg-white/8 px-4 py-3 text-base text-white placeholder-white/72 transition-all focus:outline-none focus:ring-2 disabled:opacity-50"
        style={{
          boxShadow: `0 0 0 1px ${appearance.palette.primary}20 inset`,
          border: `1px solid transparent`,
        }}
      />
      <motion.button
        type="submit"
        disabled={isStreaming || !input.trim()}
        className="min-h-12 min-w-12 rounded-2xl px-5 text-base font-semibold text-white transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50"
        style={{ background: `${appearance.palette.primary}28`, border: `1px solid ${appearance.palette.primary}40` }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
      >
        {t("chat.send")}
      </motion.button>
    </form>
  );
}

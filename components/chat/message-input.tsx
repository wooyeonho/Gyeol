import React, { useRef, useEffect } from "react";

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
  appearance: any;
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
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2 w-full max-w-4xl mx-auto">
      <label htmlFor="chat-input" className="sr-only">
        채팅 입력
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
        className="flex-1 rounded-full bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-1 transition-all disabled:opacity-50"
        style={{
          boxShadow: `0 0 0 1px ${appearance.palette.primary}20 inset`,
          border: `1px solid transparent`,
        }}
      />
      <button
        type="submit"
        disabled={isStreaming || !input.trim()}
        className="px-6 py-3 rounded-full text-white font-medium disabled:opacity-50 transition-colors hover:brightness-110 active:scale-95"
        style={{ background: `${appearance.palette.primary}28`, border: `1px solid ${appearance.palette.primary}40` }}
      >
        {t("chat.send")}
      </button>
    </form>
  );
}

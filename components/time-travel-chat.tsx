"use client";

import { useState, useRef, useEffect } from "react";

type TimeTravelChatProps = {
  targetDate: string;
  onClose?: () => void;
};

export default function TimeTravelChat({ targetDate, onClose }: TimeTravelChatProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/time-travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_date: targetDate, message: text }),
      });
      if (!res.ok || !res.body) {
        setMessages((m) => [...m, { role: "assistant", content: "과거의 나와 연결하지 못했어요." }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data:"));
        for (const line of lines) {
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
            const c = j.choices?.[0]?.delta?.content;
            if (c) full += c;
          } catch {
            // ignore
          }
        }
      }
      setMessages((m) => [...m, { role: "assistant", content: full || "..." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "오류가 발생했어요." }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[70vh] rounded-xl overflow-hidden bg-black/40 border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <span className="text-white/80 text-sm">과거의 나 · {new Date(targetDate).toLocaleDateString("ko-KR")}</span>
        {onClose && (
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white/80 text-sm">
            닫기
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-white/50 text-sm">선택한 날짜의 나에게 메시지를 보내보세요.</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-white/10 text-white"
                  : "bg-white/5 text-white/90"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <span className="w-2 h-4 bg-white/60 animate-pulse rounded" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="메시지..."
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40"
            disabled={streaming}
          />
          <button
            type="button"
            onClick={send}
            disabled={streaming || !input.trim()}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}

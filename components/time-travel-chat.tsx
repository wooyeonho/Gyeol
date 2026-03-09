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

  function fallbackPastSelfResponse(text: string): string {
    const year = new Date(targetDate).getFullYear();
    return `${year}년의 너는 아직 모든 답을 알지 못하지만, "${text}"에 너무 늦었다고 생각하지는 않았을 거야. 지금 할 수 있는 가장 작은 한 걸음을 먼저 해보자.`;
  }

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
        setMessages((m) => [...m, { role: "assistant", content: fallbackPastSelfResponse(text) }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
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
      buffer += decoder.decode();
      for (const line of buffer.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const c = j.choices?.[0]?.delta?.content;
          if (c) full += c;
        } catch {}
      }
      setMessages((m) => [...m, { role: "assistant", content: full || "..." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: fallbackPastSelfResponse(text) }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[70vh] rounded-xl overflow-hidden bg-[#2a2520] border border-amber-900/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-900/30 bg-[#1f1b18]">
        <span className="text-amber-200/90 text-sm">Past self · {new Date(targetDate).toLocaleDateString()}</span>
        {onClose && (
          <button type="button" onClick={onClose} className="text-amber-200/70 hover:text-amber-200 text-sm">
            Close
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-amber-200/50 text-sm">Send a message to your past self at this date.</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-amber-900/40 text-amber-100"
                  : "bg-amber-950/50 text-amber-200/90"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <span className="w-2 h-4 bg-amber-400/60 animate-pulse rounded" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-amber-900/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Message..."
            className="flex-1 rounded-lg bg-[#1f1b18] border border-amber-900/30 px-3 py-2 text-sm text-amber-100 placeholder-amber-200/40"
            disabled={streaming}
          />
          <button
            type="button"
            onClick={send}
            disabled={streaming || !input.trim()}
            className="rounded-lg bg-amber-800/60 px-4 py-2 text-sm font-medium text-amber-100 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

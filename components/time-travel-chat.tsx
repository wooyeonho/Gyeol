"use client";

import { useState, useRef, useEffect } from "react";

type TimeTravelChatProps = {
  targetDate: string;
  onClose?: () => void;
};

export default function TimeTravelChat({ targetDate, onClose }: TimeTravelChatProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/time-travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_date: targetDate, message: text }),
      });

      if (!res.ok || !res.body) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        const nextError = payload?.error || "과거의 자신에게 연결할 수 없어요.";
        setError(nextError);
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: nextError };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event
            .split("\n")
            .map((entry) => entry.trim())
            .find((entry) => entry.startsWith("data:"));

          if (!line) continue;

          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const chunk = json.choices?.[0]?.delta?.content;
            if (!chunk) continue;
            setMessages((m) => {
              const next = [...m];
              const lastIndex = next.length - 1;
              next[lastIndex] = {
                role: "assistant",
                content: next[lastIndex].content + chunk,
              };
              return next;
            });
          } catch {
            // Ignore malformed partial chunks.
          }
        }
      }

      setMessages((m) => {
        const next = [...m];
        const lastIndex = next.length - 1;
        if (!next[lastIndex]?.content) {
          next[lastIndex] = { role: "assistant", content: "아직은 선명한 답을 찾지 못했어." };
        }
        return next;
      });
    } catch {
      const nextError = "시간의 결이 잠시 흐려졌어요. 잠시 후 다시 시도해 주세요.";
      setError(nextError);
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content: nextError };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-amber-900/50 bg-[#2a2520]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-900/30 bg-[#1f1b18]">
        <span className="text-sm text-amber-200/90">
          과거의 결 ·{" "}
          {new Date(targetDate).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        {onClose && (
          <button type="button" onClick={onClose} className="text-sm text-amber-200/70 hover:text-amber-200">
            닫기
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-amber-200/50">
            이 날짜의 나에게 말을 걸어 보세요. 미래의 사건은 아직 모르는 상태로 답합니다.
          </p>
        )}

        {error && <p className="mb-3 text-sm text-amber-300/80">{error}</p>}

        <div role="log" aria-label="타임 트래블 대화 기록" aria-live="polite" className="space-y-3">
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
                {msg.content || (streaming && msg.role === "assistant" ? "..." : "")}
              </div>
            </div>
          ))}
        </div>

        {streaming && (
          <div className="flex justify-start">
            <span className="h-4 w-2 rounded bg-amber-400/60 animate-pulse" aria-hidden="true" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-amber-900/30">
        <div className="flex gap-2">
          <label htmlFor="time-travel-input" className="sr-only">
            과거의 자신에게 보낼 메시지
          </label>
          <input
            id="time-travel-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="그날의 나에게 말을 걸어 보세요..."
            className="flex-1 rounded-lg bg-[#1f1b18] border border-amber-900/30 px-3 py-2 text-sm text-amber-100 placeholder-amber-200/40"
            disabled={streaming}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={streaming || !input.trim()}
            className="rounded-lg bg-amber-800/60 px-4 py-2 text-sm font-medium text-amber-100 disabled:opacity-50"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}

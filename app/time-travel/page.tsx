"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Message = { role: string; content: string };

export default function TimeTravelPage() {
  const [targetDate, setTargetDate] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const defaultDate = threeMonthsAgo.toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/time-travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_date: targetDate || defaultDate, message: text }),
      });

      if (!res.ok || !res.body) {
        setMessages((m) => [...m, { role: "assistant", content: "과거로 연결할 수 없었습니다." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      setMessages((m) => [...m, { role: "assistant", content: "" }]);

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
            if (c) {
              full += c;
              setMessages((m) => {
                const last = [...m];
                last[last.length - 1] = { role: "assistant", content: full };
                return last;
              });
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "오류가 발생했습니다." }]);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, targetDate, defaultDate]);

  const displayDate = new Date(targetDate || defaultDate).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-amber-900/6 blur-[100px]" />
      </div>

      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 pt-14 pb-4 flex items-center gap-3"
      >
        <button onClick={() => router.back()} className="text-white/40 hover:text-white/70 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-light tracking-wider">타임 트래블</h1>
          {started && (
            <p className="text-xs text-amber-400/50 mt-0.5">{displayDate}의 과거 자아</p>
          )}
        </div>
        {started && (
          <button
            onClick={() => { setStarted(false); setMessages([]); }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            날짜 변경
          </button>
        )}
      </div>

      {!started ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <p className="text-white/60 text-sm font-light leading-relaxed">
                과거의 날짜를 선택하면,<br />
                그 날의 기억을 가진 AI와 대화할 수 있습니다.
              </p>
            </div>

            <div className="glass rounded-2xl p-4 space-y-3">
              <label className="text-xs text-white/35 font-light">날짜 선택</label>
              <input
                type="date"
                value={targetDate || defaultDate}
                max={maxDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/25 transition-all [color-scheme:dark]"
              />
              <div className="text-xs text-white/25 text-center">{displayDate}</div>
            </div>

            <button
              onClick={() => setStarted(true)}
              className="w-full py-4 rounded-2xl text-sm font-light tracking-wider transition-all duration-200"
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.15)",
                color: "rgba(251,191,36,0.9)",
              }}
            >
              과거로 연결하기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-3"
            style={{ paddingBottom: "5rem" }}
          >
            {messages.length === 0 && (
              <div className="text-center pt-8">
                <p className="text-white/25 text-sm">
                  {displayDate}의 기억으로 연결되었습니다
                </p>
                <p className="text-white/15 text-xs mt-2">무엇이든 물어봐...</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-sm"
                      : "rounded-bl-sm"
                  }`}
                  style={msg.role === "user"
                    ? { background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.12)", color: "rgba(255,255,255,0.75)" }
                    : { background: "rgba(255,255,255,0.04)", color: "rgba(251,191,36,0.8)" }
                  }
                >
                  {msg.content || (streaming && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1">
                      {[0, 1, 2].map((j) => (
                        <span key={j} className="w-1 h-1 rounded-full bg-amber-400/40 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                      ))}
                    </span>
                  ) : "...")}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="sticky bottom-0 px-4 bg-black/90 backdrop-blur-xl border-t border-white/5"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))", paddingTop: "0.75rem" }}
          >
            <div
              className="flex items-center gap-2 rounded-2xl overflow-hidden"
              style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.1)" }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="과거의 나에게..."
                disabled={streaming}
                className="flex-1 bg-transparent px-4 py-3.5 text-sm placeholder-white/20 focus:outline-none disabled:opacity-40"
                style={{ color: "rgba(251,191,36,0.8)" }}
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="mr-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: "rgba(251,191,36,0.15)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

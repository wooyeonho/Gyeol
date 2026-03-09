"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useRelationshipOsStore } from "@/store/relationship-os-store";
import type { CaptureSource } from "@/lib/relationship-os/types";

const SOURCES: CaptureSource[] = ["quick_note", "meeting", "chat", "email"];

export default function CapturePage() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const captures = useRelationshipOsStore((state) => state.captures);
  const addCapture = useRelationshipOsStore((state) => state.addCapture);

  const [text, setText] = useState("");
  const [source, setSource] = useState<CaptureSource>("quick_note");

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-16 pb-28">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/65">Capture</p>
          <h1 className="mt-2 text-3xl font-semibold">빠른 캡처</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/62">
            회의 메모, 대화 복붙, 흘린 약속 한 줄을 넣으면 결이 follow-up과 초안으로 구조화합니다.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSource(item)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  source === item ? "border-cyan-300/40 bg-cyan-400/[0.12] text-cyan-100" : "border-white/15 bg-white/5 text-white/70"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="예: 소라님께 오늘 5시 전까지 진행 상황 메일 보내기. 민지 피드백 반영해서 우선순위안 다시 공유."
            className="mt-4 h-40 w-full rounded-3xl border border-white/10 bg-black/30 px-4 py-4 text-sm outline-none placeholder:text-white/30 focus:border-cyan-300/30"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!text.trim()) return;
                addCapture(text, source);
                setText("");
              }}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-medium text-black"
            >
              구조화해서 저장
            </button>
            <button
              type="button"
              onClick={() => setText("")}
              className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-white/75"
            >
              비우기
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">최근 캡처</p>
          <div className="mt-4 space-y-3">
            {captures.map((capture) => (
              <article key={capture.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3 text-xs text-white/50">
                  <span>{capture.source}</span>
                  <span>{new Date(capture.createdAt).toLocaleString("ko-KR")}</span>
                </div>
                <p className="mt-3 text-sm text-white/84">{capture.rawText}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
                  <span className="rounded-full border border-white/10 px-2 py-1">
                    생성된 약속 {capture.extractedPromiseIds.length}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1">
                    생성된 초안 {capture.extractedApprovalIds.length}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}

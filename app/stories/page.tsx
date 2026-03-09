"use client";

import { BottomNav } from "@/components/bottom-nav";
import { describeFocus } from "@/lib/relationship-os/engine";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

export default function StoriesPage() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const stories = useRelationshipOsStore((state) => state.stories);

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
          <p className="text-xs uppercase tracking-[0.24em] text-fuchsia-200/65">Night Story Engine</p>
          <h1 className="mt-2 text-3xl font-semibold">밤사이 관계 이야기</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/62">
            낮 동안 쌓인 약속과 관계의 맥락을 결이 밤마다 짧은 장면, 대사, 다음 액션으로 정리합니다.
          </p>
        </header>

        <div className="space-y-4">
          {stories.map((story) => (
            <article key={story.id} className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#15111d] to-[#090c13] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-100/45">
                    {new Date(story.createdAt).toLocaleString("ko-KR")}
                  </p>
                  <h2 className="mt-2 text-2xl font-medium">{story.title}</h2>
                  <p className="mt-2 text-sm text-white/65">{story.subtitle}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
                  {describeFocus(story.focus)} · {story.mood}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">장면 요약</p>
                  <ul className="mt-3 space-y-2 text-sm text-white/82">
                    {story.beats.map((beat) => (
                      <li key={beat} className="rounded-2xl bg-black/20 px-3 py-2">
                        {beat}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">대화 장면</p>
                  <div className="mt-3 space-y-2">
                    {story.dialogue.map((line, index) => (
                      <div key={`${line.speaker}-${index}`} className="rounded-2xl bg-black/20 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">{line.speaker}</p>
                        <p className="mt-1 text-sm leading-6 text-white/84">{line.line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/[0.05] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/70">인상적인 한 줄</p>
                  <p className="mt-2 text-sm leading-6 text-white/88">{story.quote}</p>
                </div>
                <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">다음 액션</p>
                  <p className="mt-2 text-sm leading-6 text-white/88">{story.nextAction}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

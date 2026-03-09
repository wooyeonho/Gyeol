"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TimeTravelChat from "@/components/time-travel-chat";

export default function TimeTravelPage() {
  const defaultDate = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return threeMonthsAgo.toISOString().slice(0, 10);
  }, []);
  const [targetDate, setTargetDate] = useState(defaultDate);
  const [started, setStarted] = useState(false);

  return (
    <main className="min-h-screen bg-black p-4 pb-24 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100/90">
            Time Travel
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">과거의 결과 대화하기</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/[0.65]">
            선택한 날짜 이전의 대화, 기억, 자율 활동만을 바탕으로 그 시점의 존재와 대화합니다. 변화의 흐름을
            직접 체감할 수 있는 회고 모드입니다.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-medium text-white">탐색 기준점</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              관계가 달라지기 직전, 큰 감정 변화가 있었던 날, 혹은 처음 대화를 시작한 주간을 골라 보세요.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="target-date" className="mb-2 block text-sm text-white/70">
                  기준 날짜
                </label>
                <input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setStarted(true)}
                className="w-full rounded-xl bg-white/10 py-3 font-medium text-white transition hover:bg-white/[0.15]"
              >
                이 시점으로 이동하기
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium text-white">추천 질문</p>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                <li>• 지금 너에게 가장 중요한 감정은 뭐야?</li>
                <li>• 나를 어떻게 기억하고 있어?</li>
                <li>• 지금 네가 붙잡고 있는 생각 하나를 말해줘.</li>
              </ul>
            </div>
          </section>

          <section className="min-h-[28rem] rounded-[2rem] border border-white/10 bg-[#1b1713] p-3">
            {!started ? (
              <div className="flex h-full flex-col justify-center rounded-[1.5rem] border border-dashed border-amber-800/40 px-6 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-amber-200/[0.45]">Preview</p>
                <h2 className="mt-4 text-2xl font-semibold text-amber-50">아직 말을 걸지 않았어요</h2>
                <p className="mt-3 text-sm leading-6 text-amber-100/[0.65]">
                  날짜를 고른 뒤 대화를 시작하면, 그 시점까지의 기억만 가진 존재가 스트리밍으로 응답합니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <TimeTravelChat targetDate={targetDate} onClose={() => setStarted(false)} />
                <button
                  type="button"
                  onClick={() => setStarted(false)}
                  className="w-full rounded-xl bg-white/5 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white/90"
                >
                  다른 날짜 선택하기
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="mt-6">
          <Link href="/" className="text-sm text-white/50 hover:text-white/80">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}

"use client";

import { BottomNav } from "@/components/bottom-nav";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

function riskTone(risk: "low" | "medium" | "high") {
  if (risk === "high") return "border-red-400/25 bg-red-500/10";
  if (risk === "medium") return "border-amber-400/25 bg-amber-500/10";
  return "border-emerald-400/25 bg-emerald-500/10";
}

function statusLabel(status: "open" | "done" | "snoozed") {
  if (status === "done") return "완료";
  if (status === "snoozed") return "미룸";
  return "진행중";
}

export default function PromisesPage() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const promises = useRelationshipOsStore((state) => state.promises);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const togglePromiseDone = useRelationshipOsStore((state) => state.togglePromiseDone);
  const snoozePromise = useRelationshipOsStore((state) => state.snoozePromiseById);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  const ordered = [...promises].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-16 pb-28">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/65">Promise Engine</p>
          <h1 className="mt-2 text-3xl font-semibold">약속과 후속조치</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/62">
            내가 누구에게 무엇을 약속했고 언제까지 정리해야 하는지, 그리고 바로 보낼 문장까지 한 번에 관리합니다.
          </p>
        </header>

        <div className="space-y-4">
          {ordered.map((promise) => {
            const profile = profiles.find((item) => item.id === promise.personId);
            return (
              <article key={promise.id} className={`rounded-3xl border p-5 ${riskTone(promise.risk)}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/62">
                        {statusLabel(promise.status)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/62">
                        {profile?.name ?? "개인"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/62">
                        {promise.category}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-medium">{promise.title}</h2>
                    <p className="mt-2 text-sm text-white/72">{promise.context}</p>
                  </div>
                  <div className="text-sm text-white/58">
                    <p>마감</p>
                    <p className="mt-1 text-base text-white/82">
                      {new Date(promise.dueAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>

                {promise.suggestedMessage && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">추천 메시지</p>
                    <p className="mt-2 text-sm leading-6 text-white/84">{promise.suggestedMessage}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => togglePromiseDone(promise.id)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black"
                  >
                    {promise.status === "done" ? "다시 열기" : "완료"}
                  </button>
                  <button
                    type="button"
                    onClick={() => snoozePromise(promise.id)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/76"
                  >
                    하루 미루기
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

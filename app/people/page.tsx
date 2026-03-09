"use client";

import { BottomNav } from "@/components/bottom-nav";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

function cadenceLabel(value: "daily" | "weekly" | "monthly") {
  if (value === "daily") return "매일 관리";
  if (value === "weekly") return "주간 체크";
  return "월간 체크";
}

export default function PeoplePage() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const openLoopCount = useRelationshipOsStore((state) => state.openLoopCount);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-16 pb-28">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/65">People Board</p>
          <h1 className="mt-2 text-3xl font-semibold">사람별 관계 운영 보드</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/62">
            각 사람마다 신뢰, 관계 온도, 열린 루프, 선호 커뮤니케이션 스타일을 한 곳에서 보고 바로 다음 액션을 정합니다.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {profiles.map((profile) => (
            <article key={profile.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-medium">{profile.name}</p>
                  <p className="mt-1 text-sm text-white/52">{profile.role}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  {cadenceLabel(profile.cadence)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] text-white/45">신뢰</p>
                  <p className="mt-1 text-2xl font-semibold">{profile.trustScore}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] text-white/45">온도</p>
                  <p className="mt-1 text-2xl font-semibold">{profile.warmthScore}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] text-white/45">열린 루프</p>
                  <p className="mt-1 text-2xl font-semibold">{openLoopCount(profile.id)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">다음 액션 추천</p>
                <p className="mt-2 text-sm text-white/85">{profile.spark}</p>
                <p className="mt-2 text-xs text-white/55">선호 스타일: {profile.preferredStyle}</p>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">기억해야 할 포인트</p>
                <ul className="mt-3 space-y-2 text-sm text-white/72">
                  {profile.notes.map((note) => (
                    <li key={note} className="rounded-2xl bg-white/5 px-3 py-2">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

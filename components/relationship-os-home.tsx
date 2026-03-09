"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { CommandConsole } from "@/components/command-console";
import { describeFocus, describeProfileEmergence } from "@/lib/relationship-os/engine";
import { UnifiedFeatureBoard } from "@/components/unified-feature-board";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

const LAB_LINKS = [
  { href: "/features", label: "전체 기능 지도" },
  { href: "/dashboard", label: "실시간 지표" },
  { href: "/explore", label: "공개 탐험" },
  { href: "/adopt", label: "입양 보드" },
];

function riskTone(risk: "low" | "medium" | "high") {
  if (risk === "high") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (risk === "medium") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

export function RelationshipOsHome() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const promises = useRelationshipOsStore((state) => state.promises);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const addCapture = useRelationshipOsStore((state) => state.addCapture);
  const togglePromiseDone = useRelationshipOsStore((state) => state.togglePromiseDone);
  const snoozePromise = useRelationshipOsStore((state) => state.snoozePromiseById);
  const approveItem = useRelationshipOsStore((state) => state.approveItem);
  const briefing = useRelationshipOsStore((state) => state.briefing());
  const openLoopCount = useRelationshipOsStore((state) => state.openLoopCount);

  const [captureText, setCaptureText] = useState("");

  const pendingApprovals = useMemo(
    () => approvals.filter((item) => item.status === "pending").slice(0, 2),
    [approvals],
  );
  const activePromises = useMemo(
    () => promises.filter((item) => item.status !== "done"),
    [promises],
  );
  const openLoops = activePromises.length;

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_80px_rgba(82,118,255,0.12)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Relationship OS + Night Story</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                사용하다 보면 스스로 성격이 드러나고,
                <br />
                결은 그 흐름에 맞춰 진화합니다.
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/66 sm:text-base">
                관계형/게임형/운영형을 고르는 대신, 결이 현재 맥락을 읽어 실행 압력, 관계 감도, 탐험 드리프트 중 어디에
                몰입할지 자동으로 바꿉니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/50">높은 리스크</p>
                <p className="mt-1 text-2xl font-semibold">{briefing.urgentCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/50">초안 대기</p>
                <p className="mt-1 text-2xl font-semibold">{briefing.readyDraftCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/50">열린 루프</p>
                <p className="mt-1 text-2xl font-semibold">{openLoops}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/50">활성 관계</p>
                <p className="mt-1 text-2xl font-semibold">{profiles.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-3xl border border-white/10 bg-[#0d1017] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">오늘의 브리핑</p>
                  <h2 className="mt-2 text-xl font-medium">{briefing.headline}</h2>
                  <p className="mt-2 text-sm text-white/65">{briefing.summary}</p>
                  <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/68">
                      자동진화 포커스 · {describeFocus(briefing.currentFocus)}
                    </p>
                    <p className="mt-1 text-sm text-white/82">{briefing.autopilotSummary}</p>
                  </div>
                </div>
                <Link
                  href="/promises"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
                >
                  약속 전체 보기
                </Link>
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-3">
                <label htmlFor="capture-input" className="text-xs text-cyan-100/70">
                  빠른 캡처
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="capture-input"
                    value={captureText}
                    onChange={(event) => setCaptureText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && captureText.trim()) {
                        addCapture(captureText, "quick_note");
                        setCaptureText("");
                      }
                    }}
                    placeholder="예: 민지한테 오늘 안에 우선순위안 보내고, 준호에게 주말 약속 다시 잡기"
                    className="flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-cyan-300/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!captureText.trim()) return;
                      addCapture(captureText, "quick_note");
                      setCaptureText("");
                    }}
                    className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-medium text-black hover:bg-cyan-200"
                  >
                    액션으로 변환
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/42">
                  회의 메모, DM 복붙, 생각난 약속 한 줄을 넣으면 follow-up과 초안이 자동으로 붙습니다.
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {briefing.priorities.map((priority) => {
                  const promise = promises.find((item) => item.id === priority.id);
                  if (!promise) return null;
                  return (
                    <article key={priority.id} className={`rounded-2xl border p-3 ${riskTone(priority.risk)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{priority.personName}</p>
                          <h3 className="mt-1 text-sm font-medium leading-5">{priority.title}</h3>
                        </div>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70">
                          {priority.dueLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/62">{promise.context}</p>
                      {priority.suggestedMessage && (
                        <div className="mt-3 rounded-xl bg-black/20 p-2.5 text-xs text-white/82">
                          {priority.suggestedMessage}
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => togglePromiseDone(priority.id)}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black"
                        >
                          완료 처리
                        </button>
                        <button
                          type="button"
                          onClick={() => snoozePromise(priority.id)}
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/78"
                        >
                          하루 미루기
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">오늘의 자동 퀘스트</p>
                  <Link href="/stories" className="text-xs text-cyan-200/75">
                    장면 전체 보기
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {briefing.questPreview.map((quest) => (
                    <article key={quest.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                        {describeFocus(quest.focus)} · {quest.difficulty}
                      </p>
                      <h3 className="mt-1 text-sm font-medium">{quest.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-white/64">{quest.description}</p>
                      <p className="mt-2 text-[11px] text-cyan-100/72">보상: {quest.reward}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0d13] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-200/60">밤사이 스토리</p>
                  <h2 className="mt-2 text-xl font-medium">{briefing.storyPreview?.title}</h2>
                </div>
                <Link
                  href="/stories"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75"
                >
                  전체 보기
                </Link>
              </div>
              <p className="mt-2 text-sm text-white/65">{briefing.storyPreview?.subtitle}</p>
              <div className="mt-4 space-y-2">
                {briefing.storyPreview?.dialogue.map((line, index) => (
                  <div key={`${line.speaker}-${index}`} className="rounded-2xl bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">{line.speaker}</p>
                    <p className="mt-1 text-sm text-white/84">{line.line}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/[0.05] p-3">
                <p className="text-xs text-fuchsia-100/70">오늘의 한 문장</p>
                <p className="mt-2 text-sm leading-6 text-white/88">{briefing.storyPreview?.quote}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {LAB_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CommandConsole />
          <UnifiedFeatureBoard />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">관계 레이더</p>
                <h2 className="mt-2 text-xl font-medium">지금 놓치면 아쉬운 사람들</h2>
              </div>
              <Link href="/people" className="text-xs text-cyan-200/75">
                사람 보드 전체 보기
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {profiles.map((profile) => (
                <article key={profile.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  {(() => {
                    const emergence = describeProfileEmergence(
                      {
                        profiles,
                        promises,
                        approvals,
                        captures: [],
                        stories: [],
                        quests: [],
                        autonomousMode: {
                          enabled: true,
                          currentFocus: briefing.currentFocus,
                          autopilotSummary: briefing.autopilotSummary,
                          cycleCount: 0,
                          lastRunAt: new Date().toISOString(),
                          nextRunAt: new Date().toISOString(),
                        },
                      },
                      profile,
                    );
                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{profile.name}</p>
                      <p className="mt-0.5 text-xs text-white/48">{emergence.label}</p>
                    </div>
                    <div className="text-right text-xs text-white/55">
                      <p>신뢰 {profile.trustScore}</p>
                      <p>온도 {profile.warmthScore}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/72">{emergence.summary}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/55">
                    <span>열린 루프 {openLoopCount(profile.id)}개</span>
                    <span>{profile.preferredStyle}</span>
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">승인함</p>
                <h2 className="mt-2 text-xl font-medium">결이 준비한 실행안</h2>
              </div>
              <Link href="/approvals" className="text-xs text-cyan-200/75">
                승인함 전체 보기
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {pendingApprovals.map((approval) => (
                <article key={approval.id} className="rounded-2xl border border-white/10 bg-[#10141d] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{approval.targetName}</p>
                  <h3 className="mt-1 text-sm font-medium">{approval.title}</h3>
                  <p className="mt-2 text-xs text-white/55">{approval.rationale}</p>
                  <div className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-white/82">{approval.preview}</div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => approveItem(approval.id)}
                      className="rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-medium text-black"
                    >
                      승인
                    </button>
                    <Link
                      href="/approvals"
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/78"
                    >
                      수정하기
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">관계 경보</p>
              <div className="mt-3 space-y-2">
                {briefing.relationshipAlerts.map((alert) => (
                  <div key={alert.profileId} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{alert.name}</p>
                      <p className="mt-1 text-white/62">{alert.reason}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[11px] ${riskTone(alert.urgency)}`}>
                      {alert.urgency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

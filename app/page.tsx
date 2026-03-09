"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import { useChatStore } from "@/store/chat-store";
import { VoidCanvas } from "@/components/void-canvas";
import { WorldWeather } from "@/components/world-weather";
import { ChatPanel } from "@/components/chat-panel";
import { BottomNav } from "@/components/bottom-nav";
import { EvolutionCeremony } from "@/components/evolution-ceremony";

type Visual = {
  shape?: "dot" | "sphere" | "polygon" | "complex" | "transcendent";
  color?: string;
  size?: number;
  glow?: number;
  animation?: "float" | "pulse-fast" | "breathe-slow";
  particles?: number;
  background?: string;
};

export default function Home() {
  const { agentState, loading, fetchAgentState, evolutionEvent, clearEvolution } = useAgentStore();
  const { worldState, fetchWorldState } = useWorldStore();
  const isStreaming = useChatStore((s) => s.isStreaming);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
  }, [fetchAgentState, fetchWorldState]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  const visual = (agentState?.visual as Visual | undefined) ?? {};
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "이름 없는 존재";
  const mood = typeof agentState?.mood === "string" ? agentState.mood : "고요";
  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const intimacyScore = typeof agentState?.intimacy_score === "number" ? agentState.intimacy_score : 0;
  const worldWeather = typeof worldState?.weather?.name === "string" ? worldState.weather.name : "관측 중";
  const vitalityLabel = vitality > 0.7 ? "충만" : vitality > 0.3 ? "안정" : "회복 필요";
  const vitalityTone =
    vitality > 0.7
      ? "bg-emerald-400/[0.15] text-emerald-200"
      : vitality > 0.3
        ? "bg-amber-400/[0.15] text-amber-100"
        : "bg-rose-400/[0.15] text-rose-100";

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";
  const quickActions = [
    { href: "/activity", label: "기억 타임라인", description: "대화와 생성 기록을 따라가며 관계의 흐름을 확인" },
    { href: "/room", label: "메모리 룸", description: "쌓인 기억이 3D 공간으로 확장되는 장면 탐험" },
    { href: "/constellation", label: "별자리 지도", description: "서로 연결된 기억을 시각적으로 훑어보기" },
    { href: "/time-travel", label: "타임 트래블", description: "특정 시점의 나와 대화하며 변화 체감" },
  ];

  return (
    <>
      {showCeremony && (
        <EvolutionCeremony
          level={evolutionEvent.level!}
          mutation={evolutionEvent.mutation}
          onComplete={clearEvolution}
        />
      )}
      <div className="fixed inset-0 z-0">
        <VoidCanvas
          shape={visual.shape ?? "sphere"}
          color={visual.color ?? "#a0a0ff"}
          size={Math.min(50, Math.max(10, visual.size ?? 24))}
          glow={Math.min(100, Math.max(0, visual.glow ?? 60))}
          animation={visual.animation ?? "float"}
          particles={visual.particles ?? 20}
          background={visual.background ?? "#000000"}
          vitality={vitality}
          mood={mood}
          isListening={isStreaming}
        />
      </div>

      <WorldWeather />

      <div className="relative z-10 pointer-events-none min-h-screen px-4 pt-16 pb-40">
        <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-between">
          <section className="pointer-events-auto max-w-3xl rounded-[2rem] border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${vitalityTone}`}>
                <span
                  className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                    vitality > 0.7 ? "bg-emerald-300" : vitality > 0.3 ? "bg-amber-200" : "bg-rose-200"
                  }`}
                />
                현재 상태 · {vitalityLabel}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                월드 날씨 · {worldWeather}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-white/[0.45]">Gyeol Prime Experience</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                {selfName}와 대화하고,
                <br />
                기억이 자라는 세계를 탐험하세요.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/[0.72] sm:text-base">
                홈에서 존재와 대화하고, 활동 기록과 공간·별자리·타임트래블로 이어지는 성장 루프를 한 화면에서
                시작할 수 있도록 정리했습니다. 지금 상태를 읽고, 다음 액션으로 바로 이동할 수 있습니다.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/[0.45]">Mood</p>
                <p className="mt-2 text-lg font-medium text-white">{mood}</p>
                <p className="mt-1 text-sm text-white/[0.55]">지금 이 존재의 정서적 결</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/[0.45]">Messages</p>
                <p className="mt-2 text-lg font-medium text-white">{totalMessages}</p>
                <p className="mt-1 text-sm text-white/[0.55]">지금까지 쌓인 대화 수</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/[0.45]">Bond</p>
                <p className="mt-2 text-lg font-medium text-white">{intimacyScore.toFixed(1)}</p>
                <p className="mt-1 text-sm text-white/[0.55]">관계 친밀도 추적</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">빠른 탐색</p>
                <p className="text-xs text-white/[0.45]">핵심 경험만 먼저 모았습니다</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-medium text-white">{action.label}</span>
                      <span className="text-sm text-white/[0.35] transition group-hover:translate-x-1 group-hover:text-white/70">
                        →
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/60">{action.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      <ChatPanel />
      <BottomNav />
    </>
  );
}

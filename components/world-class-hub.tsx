"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { useChatStore } from "@/store/chat-store";
import { useWorldStore } from "@/store/world-store";

type Mission = {
  id: string;
  title: string;
  done: boolean;
};

const STORAGE_KEY = "gyeol-worldclass-missions-v1";

const FIRST_SESSION_PROMPTS = [
  "안녕, 오늘부터 나를 어떻게 기억하면 좋을지 물어봐줘.",
  "지금의 나를 설명하는 첫 문장을 같이 만들어줘.",
  "우리 관계를 시작하는 첫 질문 3개를 해줘.",
];

const RETURNING_PROMPTS = [
  "오늘 내 성장 포인트 3개만 뽑아줘.",
  "집중력을 높이는 20분 루틴을 짜줘.",
  "지금 기분에 맞는 음악/활동을 추천해줘.",
  "이번 주 목표를 실행 가능한 태스크로 쪼개줘.",
];

const QUICK_LINKS = [
  { href: "/activity", label: "활동 흔적" },
  { href: "/album", label: "성장 앨범" },
  { href: "/explore", label: "생태계 둘러보기" },
  { href: "/settings", label: "설정" },
];

function greetingByHour(hour: number) {
  if (hour < 5) return "깊은 밤의 집중 모드";
  if (hour < 11) return "좋은 아침, 오늘도 진화 시작";
  if (hour < 17) return "한낮의 가속 구간";
  if (hour < 22) return "저녁 리빌드 타임";
  return "하루를 정리하는 황금 시간";
}

function vitalityHint(vitality: number) {
  if (vitality >= 0.75) return "지금은 깊게 대화하기 좋은 상태예요.";
  if (vitality >= 0.45) return "짧게 감정을 정리하며 컨디션을 올려보세요.";
  return "가벼운 인사나 짧은 체크인부터 시작해도 충분해요.";
}

export function WorldClassHub() {
  const { agentState } = useAgentStore();
  const { worldState } = useWorldStore();
  const { messages, isStreaming, sendMessage } = useChatStore();

  const [now, setNow] = useState<Date>(new Date());
  const [missions, setMissions] = useState<Mission[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Mission[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is Mission =>
          Boolean(item && typeof item.id === "string" && typeof item.title === "string" && typeof item.done === "boolean"),
      );
    } catch {
      return [];
    }
  });
  const [draftMission, setDraftMission] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
    } catch {
      // Ignore storage write errors in restricted environments.
    }
  }, [missions]);

  const userMessages = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );
  const completed = useMemo(
    () => missions.reduce((acc, mission) => acc + (mission.done ? 1 : 0), 0),
    [missions],
  );
  const completionRate = missions.length === 0 ? 0 : Math.round((completed / missions.length) * 100);

  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "GYEOL";
  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const vitalityRaw = typeof agentState?.vitality === "number" ? agentState.vitality : 0;
  const vitality = Math.min(1, Math.max(0, vitalityRaw));
  const weather = typeof worldState?.weather?.name === "string" ? worldState.weather.name : "Void";
  const hour = now.getHours();
  const sessionMessages = Math.max(totalMessages, userMessages);
  const isFirstSession = sessionMessages === 0;
  const quickPrompts = isFirstSession ? FIRST_SESSION_PROMPTS : RETURNING_PROMPTS;
  const primaryPrompt = quickPrompts[0];

  const toggleMission = (id: string) => {
    setMissions((prev) => prev.map((mission) => (mission.id === id ? { ...mission, done: !mission.done } : mission)));
  };

  const removeMission = (id: string) => {
    setMissions((prev) => prev.filter((mission) => mission.id !== id));
  };

  const addMission = () => {
    const title = draftMission.trim();
    if (!title) return;
    setMissions((prev) => [{ id: crypto.randomUUID(), title, done: false }, ...prev].slice(0, 6));
    setDraftMission("");
  };

  return (
    <section className="fixed top-14 left-1/2 -translate-x-1/2 z-20 w-[min(920px,calc(100%-1.5rem))] rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-xl shadow-[0_0_80px_rgba(80,128,255,0.18)]">
      <div className="absolute inset-0 pointer-events-none rounded-2xl aurora-flow opacity-55" />
      <div className="relative space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
                {isFirstSession ? "FIRST MINUTE" : "TODAY'S START"}
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                {isFirstSession ? "첫 대화로 결의 첫 기억을 만들어보세요" : `${selfName}과 오늘의 대화를 시작할 시간이에요`}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {isFirstSession
                  ? "긴 소개는 필요 없습니다. 지금의 나를 한 줄로 말하거나, 아래 추천 질문 하나를 눌러 첫 관계를 시작해보세요."
                  : `${selfName}은 이미 쌓인 기억 위에서 반응합니다. 지금 컨디션, 고민, 목표 중 하나만 꺼내도 충분히 오늘의 흐름이 시작됩니다.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isStreaming) void sendMessage(primaryPrompt);
                }}
                disabled={isStreaming}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {isFirstSession ? "첫 인사 시작하기" : "오늘 대화 이어가기"}
              </button>
              <Link
                href={isFirstSession ? "/features" : "/activity"}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                {isFirstSession ? "사용 흐름 보기" : "최근 흔적 보기"}
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">1. 첫 행동</p>
              <p className="mt-1 text-sm text-white/85">
                {sessionMessages > 0 ? "첫 메시지를 이미 보냈습니다." : "추천 질문 하나로 첫 메시지를 보내보세요."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">2. 오늘의 초점</p>
              <p className="mt-1 text-sm text-white/85">
                {missions.length > 0 ? "미션이 준비되었습니다. 오늘의 흐름을 이어가세요." : "미션 1개만 적어도 하루가 훨씬 선명해집니다."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">3. 다음 확인</p>
              <p className="mt-1 text-sm text-white/85">
                활동과 앨범에서 결이 남긴 흔적과 변화를 다시 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-lg md:text-xl font-semibold">{selfName}</h1>
            <span className="text-xs rounded-full bg-white/10 px-2 py-1 text-white/80">{weather}</span>
            <span className="text-xs text-white/60">
              {now.toLocaleTimeString("ko-KR", { hour12: false })}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-white/75">{greetingByHour(hour)}</p>
            <p className="text-xs text-white/55">{vitalityHint(vitality)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>현재 활력</span>
              <span>{Math.round(vitality * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all duration-500"
                style={{ width: `${Math.max(4, vitality * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  if (!isStreaming) void sendMessage(prompt);
                }}
                disabled={isStreaming}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/50">기록된 대화</p>
              <p className="text-xl font-semibold">{sessionMessages}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/50">미션 달성률</p>
              <p className="text-xl font-semibold">{completionRate}%</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <div className="flex gap-2">
              <label htmlFor="mission-input" className="sr-only">
                오늘의 미션 입력
              </label>
              <input
                id="mission-input"
                value={draftMission}
                onChange={(event) => setDraftMission(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMission();
                  }
                }}
                placeholder="오늘의 미션 추가"
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/35 focus:bg-white/10"
              />
              <button
                type="button"
                onClick={addMission}
                className="rounded-lg bg-white/10 px-3 text-sm text-white/85 hover:bg-white/20"
              >
                추가
              </button>
            </div>
            <ul className="mt-2 space-y-1.5">
              {missions.length === 0 && (
                <li className="text-xs text-white/45">
                  {isFirstSession ? "첫 미션 하나만 적어도 오늘의 대화가 훨씬 쉬워집니다." : "미션을 만들면 오늘의 대화와 실행이 더 선명해집니다."}
                </li>
              )}
              {missions.map((mission) => (
                <li key={mission.id} className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleMission(mission.id)}
                    className={`h-4 w-4 rounded border ${mission.done ? "bg-cyan-300 border-cyan-200" : "border-white/40"}`}
                    aria-label="미션 완료 토글"
                  />
                  <span className={`flex-1 ${mission.done ? "line-through text-white/45" : "text-white/85"}`}>{mission.title}</span>
                  <button
                    type="button"
                    onClick={() => removeMission(mission.id)}
                    className="text-xs text-white/40 hover:text-white/70"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

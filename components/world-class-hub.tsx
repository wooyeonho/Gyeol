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

const QUICK_PROMPTS = [
  "오늘 내 성장 포인트 3개만 뽑아줘.",
  "집중력을 높이는 20분 루틴을 짜줘.",
  "지금 기분에 맞는 음악/활동을 추천해줘.",
  "이번 주 목표를 실행 가능한 태스크로 쪼개줘.",
];

const QUICK_LINKS = [
  { href: "/features", label: "기능 지도" },
  { href: "/ops", label: "운영 센터" },
  { href: "/dashboard", label: "실시간 지표" },
  { href: "/explore", label: "탐험 모드" },
  { href: "/room", label: "3D 룸" },
  { href: "/time-travel", label: "타임 트래블" },
];

function greetingByHour(hour: number) {
  if (hour < 5) return "깊은 밤의 집중 모드";
  if (hour < 11) return "좋은 아침, 오늘도 진화 시작";
  if (hour < 17) return "한낮의 가속 구간";
  if (hour < 22) return "저녁 리빌드 타임";
  return "하루를 정리하는 황금 시간";
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
  const vitalityRaw = typeof agentState?.vitality === "number" ? agentState.vitality : 0;
  const vitality = Math.min(1, Math.max(0, vitalityRaw));
  const weather = typeof worldState?.weather?.name === "string" ? worldState.weather.name : "Void";
  const hour = now.getHours();

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
      <div className="relative grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-lg md:text-xl font-semibold">{selfName}</h1>
            <span className="text-xs rounded-full bg-white/10 px-2 py-1 text-white/80">{weather}</span>
            <span className="text-xs text-white/60">
              {now.toLocaleTimeString("ko-KR", { hour12: false })}
            </span>
          </div>
          <p className="text-sm text-white/75">{greetingByHour(hour)}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Vitality</span>
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
            {QUICK_PROMPTS.map((prompt) => (
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
              <p className="text-[10px] uppercase tracking-wider text-white/50">대화 수</p>
              <p className="text-xl font-semibold">{userMessages}</p>
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
              {missions.length === 0 && <li className="text-xs text-white/45">미션을 만들면 하루가 선명해집니다.</li>}
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
    </section>
  );
}

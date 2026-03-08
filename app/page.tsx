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
  const { fetchWorldState } = useWorldStore();
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

  const isLoggedIn = !!agentState;
  const visual = (agentState?.visual as Visual | undefined) ?? {};
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "...";

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";

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
          mood={typeof agentState?.mood === "string" ? agentState.mood : undefined}
          isListening={isStreaming}
        />
      </div>

      <WorldWeather />

      <div className="fixed top-4 left-4 z-10">
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            vitality > 0.7 ? "bg-green-500" : vitality > 0.3 ? "bg-yellow-500" : "bg-red-500"
          }`}
        />
      </div>

      <div className="fixed top-4 right-4 z-10 text-white/80 text-sm">
        {selfName}
      </div>

      {isLoggedIn ? (
        <ChatPanel />
      ) : (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-end pb-32 px-6">
          <div className="w-full max-w-sm text-center space-y-4">
            <p className="text-white/70 text-sm leading-relaxed">
              결과 대화하려면 로그인해 주세요.
              <br />
              게스트로 바로 시작할 수도 있어요.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="flex-1 py-3 px-5 rounded-full bg-white/20 text-white font-medium text-sm hover:bg-white/30 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/explore"
                className="flex-1 py-3 px-5 rounded-full bg-white/5 text-white/80 text-sm hover:bg-white/10 transition-colors border border-white/10"
              >
                둘러보기
              </Link>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </>
  );
}

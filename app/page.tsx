"use client";

import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import VoidCanvas from "@/components/void-canvas";
import WorldWeather from "@/components/world-weather";
import ChatPanel from "@/components/chat-panel";
import EvolutionCeremony from "@/components/evolution-ceremony";
import Celebration from "@/components/celebration";
import Soundscape from "@/components/soundscape";
import { useChatStore } from "@/store/chat-store";

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
  const { agentState, loading, fetchAgentState, evolutionEvent, clearEvolution, celebrationEvent, clearCelebration } = useAgentStore();
  const { fetchWorldState } = useWorldStore();
  const isStreaming = useChatStore((s) => s.isStreaming);
  const [musicOn, setMusicOn] = useState(false);

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
  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "...";

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";
  const showCelebration = celebrationEvent && (celebrationEvent.title ?? celebrationEvent.kind);

  return (
    <>
      {showCeremony && (
        <EvolutionCeremony
          level={evolutionEvent.level!}
          mutation={evolutionEvent.mutation ?? null}
          onComplete={clearEvolution}
        />
      )}
      {showCelebration && (
        <Celebration
          visible={true}
          onEnd={clearCelebration}
          title={celebrationEvent.title ?? celebrationEvent.kind ?? "Celebration"}
          subtitle={celebrationEvent.subtitle}
        />
      )}
      <div className="absolute inset-0 z-0">
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

      <div className="relative z-10 flex flex-col min-h-screen">
        <WorldWeather />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              vitality > 0.7 ? "bg-green-500" : vitality > 0.3 ? "bg-yellow-500" : "bg-red-500"
            }`}
          />
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMusicOn((m) => !m)}
            className={`rounded-full p-1.5 text-xs ${musicOn ? "bg-white/20 text-white" : "text-white/40"}`}
            aria-label="Toggle music"
          >
            ♫
          </button>
          <span className="text-white/80 text-sm">{selfName}</span>
        </div>

        <div className="flex-1 flex flex-col justify-end pb-20">
          <ChatPanel />
        </div>
      </div>
      <Soundscape enabled={musicOn} soundProfile={(agentState?.sound_profile as { base_note?: string; tempo?: number } | undefined) ?? undefined} />
    </>
  );
}

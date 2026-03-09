"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import { useChatStore } from "@/store/chat-store";
import { VoidCanvas } from "@/components/void-canvas";
import { WorldWeather } from "@/components/world-weather";
import { ChatPanel } from "@/components/chat-panel";
import { BottomNav } from "@/components/bottom-nav";
import { EvolutionCeremony } from "@/components/evolution-ceremony";
import { WorldClassHub } from "@/components/world-class-hub";
import Soundscape from "@/components/soundscape";
import WidgetMini from "@/components/widget-mini";

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
      <WorldClassHub />
      <Soundscape
        enabled={Boolean((agentState?.config as { sound_enabled?: boolean } | undefined)?.sound_enabled)}
        soundProfile={(agentState?.sound_profile as { base_note?: string; tempo?: number; instruments?: string[] } | undefined) ?? null}
      />

      <div className="fixed top-4 left-4 z-10 flex items-center gap-2 text-xs text-white/70">
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            vitality > 0.7 ? "bg-green-500" : vitality > 0.3 ? "bg-yellow-500" : "bg-red-500"
          }`}
          aria-hidden="true"
        />
        <span>활력 {Math.round(vitality * 100)}%</span>
      </div>

      <div className="fixed top-4 right-4 z-10 text-white/80 text-sm">
        {selfName}
      </div>

      <div className="fixed left-4 bottom-28 z-20 hidden sm:block">
        <WidgetMini
          color={visual.color ?? "#a0a0ff"}
          size={Math.max(10, Math.min(24, (visual.size ?? 16) * 0.8))}
          quote={`${selfName} is here.`}
        />
      </div>

      <ChatPanel />
      <BottomNav />
    </>
  );
}

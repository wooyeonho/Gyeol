"use client";

import { useEffect, useState } from "react";
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

function VitalityIndicator({ vitality }: { vitality: number }) {
  const pct = Math.round(vitality * 100);
  const color = vitality > 0.7 ? "#4ade80" : vitality > 0.3 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-1.5 h-1.5">
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-50"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-light tracking-wider" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

export default function Home() {
  const { agentState, loading, fetchAgentState, evolutionEvent, clearEvolution } = useAgentStore();
  const { fetchWorldState } = useWorldStore();
  const isStreaming = useChatStore((s) => s.isStreaming);
  const messages = useChatStore((s) => s.messages);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
    setMounted(true);
  }, [fetchAgentState, fetchWorldState]);

  if (loading || !mounted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="text-2xl font-light tracking-[0.4em] text-white/80">결</span>
          <span className="w-1 h-1 rounded-full bg-white/40 animate-pulse" />
        </div>
      </div>
    );
  }

  const visual = (agentState?.visual as Visual | undefined) ?? {};
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : null;
  const genLevel = typeof agentState?.gen_level === "number" ? agentState.gen_level : 1;

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";
  const hasMessages = messages.length > 0;

  return (
    <>
      {showCeremony && (
        <EvolutionCeremony
          level={evolutionEvent.level!}
          mutation={evolutionEvent.mutation}
          onComplete={clearEvolution}
        />
      )}

      {/* 3D Canvas */}
      <div className="fixed inset-0 z-0">
        <VoidCanvas
          shape={visual.shape ?? "sphere"}
          color={visual.color ?? "#818cf8"}
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

      {/* Ambient gradient overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${(visual.color ?? "#818cf8")}08 0%, transparent 70%)`,
        }}
      />

      {/* World weather */}
      <WorldWeather />

      {/* Top bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-5 transition-all duration-500 ${
          hasMessages ? "pt-3 pb-2" : "pt-4 pb-3"
        }`}
      >
        <VitalityIndicator vitality={vitality} />

        <div className="flex flex-col items-center">
          {selfName ? (
            <span className="text-xs text-white/50 font-light tracking-[0.15em]">{selfName}</span>
          ) : (
            <span className="text-sm font-light tracking-[0.4em] text-white/30">결</span>
          )}
          {genLevel > 1 && (
            <span className="text-[9px] text-white/25 tracking-widest mt-0.5">GEN {genLevel}</span>
          )}
        </div>

        <div className="w-12 flex justify-end">
          {isStreaming && (
            <div className="flex gap-0.5 items-end h-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-full bg-white/40 animate-bounce"
                  style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty state hint */}
      {!hasMessages && !loading && (
        <div className="fixed inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-white/15 text-sm font-light tracking-widest">
              {selfName ? `${selfName}가 기다리고 있어` : "말을 걸어봐"}
            </p>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      <ChatPanel />

      {/* Bottom Nav */}
      <BottomNav />
    </>
  );
}

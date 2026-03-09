"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]">
        <div className="gradient-void absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-[var(--accent)] animate-pulse" />
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-[var(--accent)] animate-ping opacity-30" />
          </div>
          <span className="text-sm text-[var(--muted)] font-medium">결을 불러오는 중</span>
        </motion.div>
      </div>
    );
  }

  const visual = (agentState?.visual as Visual | undefined) ?? {};
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "...";

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";

  const vitalityColor =
    vitality > 0.7 ? "var(--vitality-high)" : vitality > 0.3 ? "var(--vitality-mid)" : "var(--vitality-low)";

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
          color={visual.color ?? "#e8b86d"}
          size={Math.min(50, Math.max(10, visual.size ?? 24))}
          glow={Math.min(100, Math.max(0, visual.glow ?? 60))}
          animation={visual.animation ?? "float"}
          particles={visual.particles ?? 20}
          background={visual.background ?? "#050508"}
          vitality={vitality}
          mood={typeof agentState?.mood === "string" ? agentState.mood : undefined}
          isListening={isStreaming}
        />
        <div className="gradient-void pointer-events-none absolute inset-0" />
      </div>

      <WorldWeather />

      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-2"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="relative h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: vitalityColor }}
          >
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-40"
              style={{ backgroundColor: vitalityColor }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--muted)]">
            {vitality > 0.7 ? "활력" : vitality > 0.3 ? "보통" : "저하"}
          </span>
        </div>
        <span className="font-display text-sm font-medium text-[var(--foreground)] tracking-tight">
          {selfName}
        </span>
      </motion.header>

      <ChatPanel />
      <BottomNav />
    </>
  );
}

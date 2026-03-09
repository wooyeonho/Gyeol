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

function VitalityDot({ vitality }: { vitality: number }) {
  const color =
    vitality > 0.7 ? "#34d399" : vitality > 0.3 ? "#fbbf24" : "#f87171";
  const label =
    vitality > 0.7 ? "건강함" : vitality > 0.3 ? "보통" : "허약함";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="flex items-center gap-2"
    >
      <div className="relative">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: color }}
        />
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: color, opacity: 0.4 }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {label}
      </span>
    </motion.div>
  );
}

function AgentNameBadge({ name, genLevel }: { name: string; genLevel?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="flex items-center gap-2"
    >
      {genLevel != null && genLevel > 1 && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: "rgba(124,58,237,0.3)",
            border: "1px solid rgba(124,58,237,0.4)",
            color: "#c4b5fd",
          }}
        >
          Gen {genLevel}
        </span>
      )}
      <span className="text-sm font-medium text-white/80">{name}</span>
    </motion.div>
  );
}

export default function Home() {
  const { agentState, loading, fetchAgentState, evolutionEvent, clearEvolution } =
    useAgentStore();
  const { fetchWorldState } = useWorldStore();
  const isStreaming = useChatStore((s) => s.isStreaming);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
  }, [fetchAgentState, fetchWorldState]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full bg-violet-400"
        />
      </div>
    );
  }

  const visual = (agentState?.visual as Visual | undefined) ?? {};
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "...";
  const genLevel = typeof agentState?.gen_level === "number" ? agentState.gen_level : undefined;

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

      {/* 3D Canvas Background */}
      <div className="fixed inset-0 z-0">
        <VoidCanvas
          shape={visual.shape ?? "sphere"}
          color={visual.color ?? "#7c3aed"}
          size={Math.min(50, Math.max(10, visual.size ?? 26))}
          glow={Math.min(100, Math.max(0, visual.glow ?? 70))}
          animation={visual.animation ?? "float"}
          particles={visual.particles ?? 24}
          background={visual.background ?? "#000000"}
          vitality={vitality}
          mood={typeof agentState?.mood === "string" ? agentState.mood : undefined}
          isListening={isStreaming}
        />
      </div>

      {/* Subtle vignette */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* World Weather */}
      <WorldWeather />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 pt-4 pb-2 pointer-events-none">
        <VitalityDot vitality={vitality} />
        <AgentNameBadge name={selfName} genLevel={genLevel} />
      </div>

      {/* Chat */}
      <ChatPanel />

      {/* Bottom nav */}
      <BottomNav />
    </>
  );
}

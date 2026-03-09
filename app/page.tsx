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
import { motion } from "framer-motion";

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
  const percent = Math.round(vitality * 100);
  const color =
    vitality > 0.7 ? "bg-emerald-400" : vitality > 0.3 ? "bg-amber-400" : "bg-red-400";
  const glowColor =
    vitality > 0.7
      ? "shadow-emerald-400/30"
      : vitality > 0.3
        ? "shadow-amber-400/30"
        : "shadow-red-400/30";

  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-2 h-2 rounded-full ${color} shadow-lg ${glowColor} animate-breathe`} />
      <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function GenBadge({ level }: { level: number }) {
  return (
    <div className="glass rounded-full px-2.5 py-0.5 flex items-center gap-1.5">
      <span className="text-[10px] text-accent-light font-semibold tracking-wider">GEN</span>
      <span className="text-xs font-bold text-white">{level}</span>
    </div>
  );
}

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
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/60"
              style={{
                animation: "dot-pulse 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const visual = (agentState?.visual as Visual | undefined) ?? {};
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "";
  const genLevel = typeof agentState?.gen_level === "number" ? agentState.gen_level : 1;
  const mood = typeof agentState?.mood === "string" ? agentState.mood : "";
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
          color={visual.color ?? "#7c6ef0"}
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

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed top-4 left-4 z-10 flex items-center gap-3"
      >
        <VitalityIndicator vitality={vitality} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="fixed top-4 right-4 z-10 flex items-center gap-2"
      >
        <GenBadge level={genLevel} />
        {selfName && (
          <span className="text-sm font-medium text-white/70 tracking-wide">{selfName}</span>
        )}
      </motion.div>

      {mood && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed top-12 right-4 z-10"
        >
          <span className="text-xs text-white/30 italic">{mood}</span>
        </motion.div>
      )}

      <ChatPanel />
      <BottomNav />
    </>
  );
}

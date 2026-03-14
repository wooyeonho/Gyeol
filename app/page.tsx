"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import { useChatStore } from "@/store/chat-store";
import { useTranslations } from "@/components/i18n-provider";
import Soundscape from "@/components/soundscape";
import { useDevicePerformance } from "@/hooks/use-device-performance";

const VoidCanvas = dynamic(() => import("@/components/void-canvas").then((m) => ({ default: m.VoidCanvas })), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-0 bg-black" aria-hidden="true" />,
});
import { ChatPanel } from "@/components/chat-panel";
import { BottomNav } from "@/components/bottom-nav";
import { EvolutionCeremony } from "@/components/evolution-ceremony";
import { WorldClassHub } from "@/components/world-class-hub";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

type Visual = {
  shape?: "dot" | "sphere" | "polygon" | "complex" | "transcendent" | "creature" | "humanoid" | "beast" | "amorphous" | "seraph";
  color?: string;
  size?: number;
  glow?: number;
  animation?: "float" | "pulse-fast" | "breathe-slow";
  particles?: number;
  background?: string;
};

export default function Home() {
  const { locale } = useTranslations();
  const { agentState, loading, fetchAgentState, evolutionEvent, clearEvolution } = useAgentStore();
  const { fetchWorldState } = useWorldStore();
  const isStreaming = useChatStore((s) => s.isStreaming);
  const pendingUsageMode = useChatStore((s) => s.pendingUsageMode);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
  }, [fetchAgentState, fetchWorldState]);

  const visual = (agentState?.visual as Visual | undefined) ?? {};
  const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
  const isLowDevice = useDevicePerformance();
  const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
  const performanceMinimal = config.performance_minimal === true || isLowDevice;
  const effectiveConfig = useMemo(
    () => ({
      mutation_trait: typeof config.mutation_trait === "string" ? config.mutation_trait : null,
      usage_profile: pendingUsageMode
        ? { ...(config.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined), primary_mode: pendingUsageMode }
        : ((config.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined) ?? null),
    }),
    [config.mutation_trait, config.usage_profile, pendingUsageMode]
  );
  const appearance = resolveIdentityAppearance(
    {
      selfName: typeof agentState?.self_name === "string" ? agentState.self_name : null,
      visual,
      genome: (agentState?.genome as { species?: string | null; mutations?: string[] | null } | undefined) ?? null,
      selfModel: (agentState?.self_model as { current_role?: string | null; identity_statement?: string | null } | undefined) ?? null,
      config: effectiveConfig,
      genLevel: typeof agentState?.gen_level === "number" ? agentState.gen_level : 1,
      vitality,
      mood: typeof agentState?.mood === "string" ? agentState.mood : null,
    },
    locale
  );
  const soundProfile = (agentState?.sound_profile as { base_note?: string; tempo?: number; instruments?: string[] } | undefined) ?? {
    base_note: appearance.sound.baseNote,
    tempo: appearance.sound.tempo,
    instruments: appearance.sound.instruments,
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-all duration-1000">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-xl animate-pulse opacity-20"
            style={{ backgroundColor: appearance.palette.primary }}
          />
          <div
            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center relative z-10"
            style={{ boxShadow: `0 0 20px ${appearance.palette.primary}20 inset` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-ping" />
          </div>
        </div>
        <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-white/30 animate-pulse">
          {locale === "ko" ? "결을 조율하는 중..." : "Awakening Presence..."}
        </p>
      </div>
    );
  }

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
      <div
        className="fixed inset-0 z-0 transition-[background] duration-700"
        style={{ backgroundImage: appearance.scene.backgroundGradient }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90 transition-all duration-700"
          style={{
            backgroundImage: appearance.scene.overlayGradient,
            transform: isStreaming || pendingUsageMode ? `scale(${appearance.scene.pulseScale})` : "scale(1)",
            filter: appearance.scene.motionBias === "mystic" ? "blur(8px)" : "blur(2px)",
          }}
        />
        {performanceMinimal ? (
          <div
            className="fixed inset-0"
            style={{ backgroundImage: appearance.scene.backgroundGradient }}
            aria-hidden="true"
          />
        ) : (
          <VoidCanvas
            shape={appearance.visual.shape as Visual["shape"]}
            color={appearance.visual.color}
            size={Math.min(50, Math.max(10, visual.size ?? 24))}
            glow={Math.min(100, Math.max(0, appearance.visual.glow))}
            animation={appearance.visual.animation}
            particles={appearance.visual.particles}
            background={appearance.visual.background}
            vitality={vitality}
            mood={typeof agentState?.mood === "string" ? agentState.mood : undefined}
            isListening={isStreaming}
            motionBias={appearance.scene.motionBias}
            pulseScale={appearance.scene.pulseScale}
          />
        )}
      </div>
      <WorldClassHub />

      <ChatPanel />
      <Soundscape
        enabled={!performanceMinimal}
        soundProfile={soundProfile}
        label={appearance.sound.label}
        accentColor={appearance.palette.primary}
      />
      <BottomNav />
    </>
  );
}

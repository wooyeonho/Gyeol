"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import { useChatStore } from "@/store/chat-store";
import { useTranslations } from "@/components/i18n-provider";
import Soundscape from "@/components/soundscape";
import { RewardToast } from "@/components/reward-toast";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { deriveEmotionMood, getEmotionSoundProfile } from "@/lib/soundscape/emotion-map";
import { haptic } from "@/lib/micro-interactions";
import { AgeGate } from "@/components/age-gate";
import { Onboarding } from "@/components/onboarding";
import { markAgeGateCompleted, readAgeGateCompleted } from "@/lib/safety/age-gate";

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
  const { locale, t } = useTranslations();
  const { agentState, loading, error, fetchAgentState, evolutionEvent, clearEvolution } = useAgentStore();
  const { fetchWorldState } = useWorldStore();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const pendingUsageMode = useChatStore((s) => s.pendingUsageMode);
  const claimDailyLoginBonus = useChatStore((s) => s.claimDailyLoginBonus);

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
  // Derive emotion-based sound profile dynamically from agent state
  const emotionMood = useMemo(() => {
    const v = typeof agentState?.vitality === "number" ? agentState.vitality : 0.5;
    const trust = typeof agentState?.intimacy_score === "number" ? agentState.intimacy_score : 0.3;
    const tone = typeof agentState?.mood === "string"
      ? (agentState.mood === "joyful" || agentState.mood === "energetic" ? "positive" as const
        : agentState.mood === "melancholy" ? "negative" as const
        : "neutral" as const)
      : null;
    return deriveEmotionMood(v, trust, tone);
  }, [agentState?.vitality, agentState?.intimacy_score, agentState?.mood]);

  const soundProfile = useMemo(() => {
    const emotionProfile = getEmotionSoundProfile(emotionMood);
    return {
      base_note: emotionProfile.base_note,
      tempo: emotionProfile.tempo,
      instruments: emotionProfile.instruments,
      scale: emotionProfile.scale,
    };
  }, [emotionMood]);

  const lastReward = useChatStore((s) => s.lastReward);
  const clearReward = useChatStore((s) => s.clearReward);
  const handleDismissReward = useCallback(() => clearReward(), [clearReward]);

  const handleCanvasTap = useCallback(() => {
    haptic("tap");
  }, []);

  // Onboarding state — show once per device
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("gyeol_onboarded");
  });
  const [showAgeGate, setShowAgeGate] = useState(() => {
    if (typeof window === "undefined") return false;
    return !readAgeGateCompleted();
  });

  const handleOnboardingComplete = useCallback(
    async (personalityMode?: string) => {
      localStorage.setItem("gyeol_onboarded", "1");
      setShowOnboarding(false);
      if (personalityMode) {
        try {
          await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personality_mode: personalityMode }),
          });
          await fetchAgentState({ silent: true });
        } catch {
          // Best-effort; onboarding should still proceed even if save fails
        }
      }
    },
    [fetchAgentState],
  );

  const handleAgeGateComplete = useCallback(
    async ({ ageGroup, guardianConsent }: { ageGroup: "under_13" | "teen" | "adult"; guardianConsent: boolean }) => {
      markAgeGateCompleted();
      setShowAgeGate(false);
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age_group: ageGroup,
            guardian_consent: guardianConsent,
            social_public_enabled: ageGroup === "adult",
          }),
        });
        await fetchAgentState({ silent: true });
      } catch {
        // Best-effort only; local gate completion should still proceed.
      }
    },
    [fetchAgentState],
  );

  useEffect(() => {
    if (loading || showOnboarding) return;

    const streakDays = typeof agentState?.streak_days === "number" ? agentState.streak_days : 0;
    claimDailyLoginBonus(streakDays);
  }, [agentState?.streak_days, claimDailyLoginBonus, loading, showOnboarding]);

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
        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/50 animate-pulse">
          {t("common.awakening")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 px-6">
        <div className="w-16 h-16 rounded-full border border-red-400/30 bg-red-400/10 flex items-center justify-center mb-6">
          <span className="text-2xl">&#x26A0;</span>
        </div>
        <h2 className="text-lg font-semibold text-white">
          {t("common.connectionFailed")}
        </h2>
        <p className="mt-2 text-sm text-white/60 text-center">
          {t("common.connectionFailedBody")}
        </p>
        <button
          type="button"
          onClick={() => fetchAgentState()}
          className="mt-6 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";
  const conversationStarted =
    (typeof agentState?.total_messages === "number" ? agentState.total_messages : 0) > 0 ||
    messages.some((message) => message.role === "user");

  if (showAgeGate) {
    return <AgeGate onComplete={handleAgeGateComplete} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      {showCeremony && (
        <EvolutionCeremony
          level={evolutionEvent.level!}
          mutation={evolutionEvent.mutation}
          onComplete={clearEvolution}
          selfName={typeof agentState?.self_name === "string" ? agentState.self_name : undefined}
          primaryColor={appearance.palette.primary}
          secondaryColor={appearance.palette.secondary}
          species={(agentState?.genome as { species?: string } | undefined)?.species}
          shareBaseUrl={typeof window !== "undefined" ? window.location.origin : undefined}
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
          onTap={handleCanvasTap}
          enableThree={!performanceMinimal && conversationStarted}
        />
      </div>
      {/* Hub is now inline, not a fixed overlay — no pointer-events conflict */}
      <div className="relative z-10">
        <WorldClassHub />
      </div>

      <ChatPanel navVisible={conversationStarted} />
      <Soundscape
        enabled={!performanceMinimal}
        soundProfile={soundProfile}
        label={appearance.sound.label}
        accentColor={appearance.palette.primary}
      />
      <RewardToast
        reward={lastReward}
        locale={locale}
        onDismiss={handleDismissReward}
      />
      {conversationStarted && <BottomNav />}
    </>
  );
}

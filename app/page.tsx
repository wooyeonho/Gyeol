"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import { useChatStore } from "@/store/chat-store";
import { useTranslations } from "@/components/i18n-provider";
import Soundscape from "@/components/soundscape";
import { RewardToast } from "@/components/reward-toast";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useCreatureState } from "@/hooks/use-creature-state";
import { useCircadianTint } from "@/hooks/use-circadian-tint";
import { useOnboardingGate } from "@/hooks/use-onboarding-gate";
import { useEmotionSound } from "@/hooks/use-emotion-sound";
import { haptic } from "@/lib/micro-interactions";
import { motion } from "framer-motion";
import { AgeGate } from "@/components/age-gate";
import { Onboarding } from "@/components/onboarding";
import { LivingFeed } from "@/components/living-feed";
import { CreatureStatusIndicator } from "@/components/creature-status";

const VoidCanvas = dynamic(() => import("@/components/void-canvas").then((m) => ({ default: m.VoidCanvas })), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-0 bg-black" aria-hidden="true" />,
});
import { ChatPanel } from "@/components/chat-panel";
import { BottomNav } from "@/components/bottom-nav";
import { EvolutionCeremony } from "@/components/evolution-ceremony";
import { WorldClassHub } from "@/components/world-class-hub";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import type { AgentVisual } from "@/types/agent";

export default function Home() {
  const { locale, t } = useTranslations();
  const { agentState, loading, error, fetchAgentState, evolutionEvent, clearEvolution } = useAgentStore();
  const { fetchWorldState } = useWorldStore();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const pendingUsageMode = useChatStore((s) => s.pendingUsageMode);
  const claimDailyLoginBonus = useChatStore((s) => s.claimDailyLoginBonus);
  const injectGreeting = useChatStore((s) => s.injectGreeting);
  const historyLoaded = useChatStore((s) => s.historyLoaded);
  const lastReward = useChatStore((s) => s.lastReward);
  const clearReward = useChatStore((s) => s.clearReward);

  // --- Extracted hooks ---
  const circadian = useCircadianTint();
  const { showAgeGate, showOnboarding, handleAgeGateComplete, handleOnboardingComplete } = useOnboardingGate();
  const { soundProfile } = useEmotionSound();

  // --- Greeting injection ---
  const greetingInjectedRef = useRef(false);
  const [pendingGreeting, setPendingGreeting] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
  }, [fetchAgentState, fetchWorldState]);

  useEffect(() => {
    if (!historyLoaded || !pendingGreeting || greetingInjectedRef.current) return;
    greetingInjectedRef.current = true;
    injectGreeting({
      id: `greeting-${Date.now()}`,
      role: "assistant" as const,
      content: pendingGreeting,
    });
  }, [historyLoaded, pendingGreeting, injectGreeting]);

  const handleGreetingReady = useCallback((greeting: string) => {
    if (!greeting || greetingInjectedRef.current) return;
    setPendingGreeting(greeting);
  }, []);

  // --- Visual / creature state ---
  const visual: AgentVisual = agentState?.visual ?? {};
  const vitality = agentState?.vitality ?? 1;
  const { isLowDevice } = useDevicePerformance();
  const creature = useCreatureState(vitality, isStreaming);
  const config = agentState?.config ?? {};
  const performanceMinimal = config.performance_minimal === true || isLowDevice;

  const effectiveConfig = useMemo(
    () => ({
      mutation_trait: config.mutation_trait ?? null,
      usage_profile: pendingUsageMode
        ? { ...config.usage_profile, primary_mode: pendingUsageMode }
        : (config.usage_profile ?? null),
    }),
    [config.mutation_trait, config.usage_profile, pendingUsageMode]
  );

  const appearance = resolveIdentityAppearance(
    {
      selfName: agentState?.self_name ?? null,
      visual,
      genome: agentState?.genome ?? null,
      selfModel: agentState?.self_model ?? null,
      config: effectiveConfig,
      genLevel: agentState?.gen_level ?? 1,
      vitality,
      mood: agentState?.mood ?? null,
    },
    locale
  );

  // --- Event handlers ---
  const handleDismissReward = useCallback(() => clearReward(), [clearReward]);
  const handleCanvasTap = useCallback(() => {
    haptic("tap");
    creature.excite();
  }, [creature]);

  // --- Daily login bonus ---
  useEffect(() => {
    if (loading || showOnboarding) return;
    const streakDays = agentState?.streak_days ?? 0;
    claimDailyLoginBonus(streakDays);
  }, [agentState?.streak_days, claimDailyLoginBonus, loading, showOnboarding]);

  // --- Render: loading / error / gates ---
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-all duration-1000">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-xl animate-pulse opacity-20"
            style={{ backgroundColor: "var(--accent)" }}
          />
          <div
            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center relative z-10"
            style={{ boxShadow: "0 0 20px color-mix(in srgb, var(--accent) 20%, transparent) inset" }}
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
          className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (showAgeGate) return <AgeGate onComplete={handleAgeGateComplete} />;
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";
  const conversationStarted =
    (agentState?.total_messages ?? 0) > 0 ||
    messages.some((message) => message.role === "user");

  return (
    <>
      {showCeremony && (
        <EvolutionCeremony
          level={evolutionEvent.level!}
          mutation={evolutionEvent.mutation}
          onComplete={clearEvolution}
          selfName={agentState?.self_name ?? undefined}
          primaryColor={appearance.palette.primary}
          secondaryColor={appearance.palette.secondary}
          species={agentState?.genome?.species ?? undefined}
          shareBaseUrl={typeof window !== "undefined" ? window.location.origin : undefined}
        />
      )}
      <div
        className="fixed inset-0 z-0 transition-[background] duration-700"
        style={{ backgroundImage: appearance.scene.backgroundGradient }}
      >
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-[3000ms]"
          style={{ backgroundImage: circadian.overlay }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-90 transition-all duration-700"
          style={{
            backgroundImage: appearance.scene.overlayGradient,
            transform: isStreaming || pendingUsageMode ? `scale(${appearance.scene.pulseScale})` : "scale(1)",
            filter: appearance.scene.motionBias === "mystic" ? "blur(8px)" : "blur(2px)",
          }}
        />
        <VoidCanvas
          shape={appearance.visual.shape as AgentVisual["shape"]}
          color={appearance.visual.color}
          size={Math.min(50, Math.max(10, visual.size ?? 24))}
          glow={Math.min(100, Math.max(0, appearance.visual.glow))}
          animation={appearance.visual.animation}
          particles={appearance.visual.particles}
          background={appearance.visual.background}
          vitality={vitality}
          mood={agentState?.mood ?? undefined}
          isListening={isStreaming}
          motionBias={appearance.scene.motionBias}
          pulseScale={appearance.scene.pulseScale}
          onTap={handleCanvasTap}
          enableThree={!performanceMinimal}
          breathPhase={creature.state.breathPhase}
          creatureActivity={creature.state.activity}
          excitePulse={creature.state.excitePulse}
          pointerNorm={creature.state.pointerNorm}
        />
      </div>
      <div className="pointer-events-none relative z-20">
        <div className="pointer-events-auto">
          <WorldClassHub />
        </div>
        <div className="pointer-events-auto">
          <CreatureStatusIndicator activity={creature.state.activity} />
        </div>
        <div className="pointer-events-auto mt-2">
          <LivingFeed onGreetingReady={handleGreetingReady} />
        </div>
      </div>

      {!conversationStarted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex flex-col items-center gap-3 px-6"
        >
          <div className="pointer-events-auto rounded-2xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-md px-5 py-4 max-w-sm text-center">
            <p className="text-sm text-white/80 leading-relaxed">
              {t("home.firstTimeGuide")}
            </p>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mt-3 text-white/40"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      )}

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
      <BottomNav />
    </>
  );
}

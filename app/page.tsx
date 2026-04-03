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
import { deriveEmotionMood, getEmotionSoundProfile } from "@/lib/soundscape/emotion-map";
import { getCircadianTint } from "@/lib/circadian";
import { deriveDNATheme, applyDNAThemeToRoot } from "@/lib/theme/dna-theme";
import { haptic } from "@/lib/micro-interactions";
import { getIdleBehaviorParams } from "@/lib/creature/idle-behaviors";
import { motion } from "framer-motion";
import { AgeGate } from "@/components/age-gate";
import { Onboarding } from "@/components/onboarding";
import { DeathScreen } from "@/components/death-screen";
const LivingFeed = dynamic(() => import("@/components/living-feed").then((m) => ({ default: m.LivingFeed })), {
  ssr: false,
  loading: () => null,
});
import { CreatureStatusIndicator } from "@/components/creature-status";
import { StreakDisplay } from "@/components/streak-display";
import { markAgeGateCompleted, readAgeGateCompleted } from "@/lib/safety/age-gate";

const VoidCanvas = dynamic(() => import("@/components/void-canvas").then((m) => ({ default: m.VoidCanvas })), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" aria-hidden="true" />,
});
const ChatPanel = dynamic(() => import("@/components/chat-panel").then((m) => ({ default: m.ChatPanel })), {
  ssr: false,
  loading: () => <div className="h-full" />,
});
import { BottomNav } from "@/components/bottom-nav";
const EvolutionCeremony = dynamic(() => import("@/components/evolution-ceremony").then((m) => ({ default: m.EvolutionCeremony })), {
  ssr: false,
  loading: () => null,
});
import { WorldClassHub } from "@/components/world-class-hub";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";
import { GlobalFeedTicker } from "@/components/global-feed-ticker";
import { WorldWeather } from "@/components/world-weather";
import Celebration from "@/components/celebration";
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
  const greetingInjectedRef = useRef(false);
  const [pendingGreeting, setPendingGreeting] = useState<string | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
  }, [fetchAgentState, fetchWorldState]);

  // Fetch latest portrait — runs once when agent first loads
  const portraitFetchedRef = useRef(false);
  useEffect(() => {
    if (!agentState || portraitFetchedRef.current) return;
    portraitFetchedRef.current = true;
    fetch("/api/creature/portrait", { signal: AbortSignal.timeout(8000) })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.portraits?.length) return;
        try {
          const latest = JSON.parse(data.portraits[0].content);
          if (latest?.image) setPortraitUrl(latest.image);
        } catch { /* ignore parse error */ }
      })
      .catch(() => { /* non-critical */ });
  }, [agentState]);

  // Transfer demo DNA to new account (runs once after first agent creation)
  const dnaSeededRef = useRef(false);
  useEffect(() => {
    if (dnaSeededRef.current || loading || !agentState) return;
    try {
      const raw = sessionStorage.getItem("gyeol_demo_dna");
      if (!raw) return;
      dnaSeededRef.current = true;
      const demoDna = JSON.parse(raw);
      fetch("/api/agent/seed-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dna: demoDna }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.seeded) fetchAgentState({ silent: true });
        })
        .catch(() => {})
        .finally(() => {
          sessionStorage.removeItem("gyeol_demo_dna");
          sessionStorage.removeItem("gyeol_demo_reading");
        });
    } catch {}
  }, [loading, agentState, fetchAgentState]);

  // Inject greeting once history is loaded — no rAF polling needed
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

  const visual: AgentVisual = agentState?.visual ?? {};
  const vitality = agentState?.vitality ?? 1;
  const { isLowDevice } = useDevicePerformance();
  const creatureDna = useMemo(() => {
    const genome = agentState?.genome as { dna?: Record<string, number> } | null | undefined;
    return (genome?.dna ?? null) as import("@/lib/genome/dna").CreatureDNA | null;
  }, [agentState?.genome]);
  const creature = useCreatureState(vitality, isStreaming, agentState?.mood ?? null, creatureDna);
  const idleBehaviorParams = useMemo(
    () => getIdleBehaviorParams(creature.state.idleActivity),
    [creature.state.idleActivity],
  );
  const [circadian, setCircadian] = useState(() => getCircadianTint());
  useEffect(() => {
    const update = () => setCircadian(getCircadianTint());
    const id = setInterval(update, 60 * 60 * 1000); // refresh every hour
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    if (!creatureDna) return;
    applyDNAThemeToRoot(deriveDNATheme(creatureDna));
  }, [creatureDna]);
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
  // Derive emotion-based sound profile dynamically from agent state
  // Now passes creature mood directly for richer 28-mood sound mapping
  const emotionMood = useMemo(() => {
    const v = agentState?.vitality ?? 0.5;
    const trust = agentState?.intimacy_score ?? 0.3;
    const creatureMood = agentState?.mood ?? null;
    const tone = creatureMood === "joyful" || creatureMood === "energetic" ? "positive" as const
      : creatureMood === "melancholy" ? "negative" as const
      : creatureMood ? "neutral" as const
      : null;
    return deriveEmotionMood(v, trust, tone, creatureMood);
  }, [agentState?.vitality, agentState?.intimacy_score, agentState?.mood]);

  const soundProfile = useMemo(() => {
    const energyMult = 1 + (creature.state.conversationEnergy ?? 0) * 0.5;
    const emotionProfile = getEmotionSoundProfile(emotionMood, energyMult);
    return {
      base_note: emotionProfile.base_note,
      tempo: emotionProfile.tempo,
      instruments: emotionProfile.instruments,
      scale: emotionProfile.scale,
      volume: emotionProfile.volume,
    };
  }, [emotionMood, creature.state.conversationEnergy]);

  const lastReward = useChatStore((s) => s.lastReward);
  const clearReward = useChatStore((s) => s.clearReward);
  const handleDismissReward = useCallback(() => clearReward(), [clearReward]);

  // Boost conversation energy when new user messages are sent
  // Gate on historyLoaded to avoid spurious boost from initial chat history hydration.
  // Iterate all new messages to handle React batching (sendMessage appends user + assistant placeholder in one render).
  const prevMsgCountRef = useRef(0);
  const historySeenRef = useRef(false);
  useEffect(() => {
    if (!historyLoaded) return;
    const curr = messages.length;
    // First time historyLoaded becomes true: sync ref without boosting
    if (!historySeenRef.current) {
      historySeenRef.current = true;
      prevMsgCountRef.current = curr;
      return;
    }
    const prev = prevMsgCountRef.current;
    prevMsgCountRef.current = curr;
    if (curr > prev) {
      for (let i = prev; i < curr; i++) {
        if (messages[i] && messages[i].role === "user") {
          creature.boostConversationEnergy(0.25);
          break;
        }
      }
    }
  }, [messages, creature, historyLoaded]);

  // Creature reward reaction — visual pulse when rewards fire
  // Use object reference equality to deduplicate: creature dep changes every render,
  // but lastReward only gets a new object reference when a new reward actually fires.
  const lastRewardRef = useRef<typeof lastReward>(null);
  const rewardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!lastReward) return;
    // Deduplicate: only react once per reward object instance
    if (lastRewardRef.current === lastReward) return;
    lastRewardRef.current = lastReward;

    // Tier-scaled intensity
    const tierIntensity: Record<string, number> = {
      small: 0.15,
      medium: 0.25,
      large: 0.4,
      jackpot: 0.6,
    };
    const intensity = tierIntensity[lastReward.tier] ?? 0.1;

    creature.excite();
    creature.boostConversationEnergy(intensity);

    // Jackpot/large get a delayed second pulse for "double-take" effect.
    // Use a ref so the timer survives creature dep changes (~66ms cycle).
    if (lastReward.tier === "jackpot" || lastReward.tier === "large") {
      if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
      rewardTimerRef.current = setTimeout(() => {
        rewardTimerRef.current = null;
        creature.excite();
        creature.boostConversationEnergy(intensity * 0.6);
      }, 500);
    }
  }, [lastReward, creature]);

  const handleCanvasTap = useCallback(() => {
    haptic("tap");
    creature.excite();
  }, [creature]);

  // Zelda-like touch freedom: every gesture type affects creature affinity
  const handleCreatureTouch = useCallback((affinityDelta: number) => {
    creature.recordCreatureTouch(affinityDelta);
    // Haptic feedback varies by touch intensity
    if (affinityDelta >= 0.3) haptic("success");
    else if (affinityDelta >= 0.1) haptic("send");
  }, [creature]);

  // Creature comeback reaction — triple excite pulse "wiggle of recognition"
  const handleComebackDetected = useCallback((multiplier: number) => {
    void multiplier; // multiplier available for future intensity scaling
    creature.excite();
    creature.boostConversationEnergy(0.3);
    const t1 = setTimeout(() => {
      creature.excite();
      creature.boostConversationEnergy(0.2);
    }, 600);
    const t2 = setTimeout(() => {
      creature.excite();
      creature.boostConversationEnergy(0.15);
    }, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [creature]);

  const handleCelebrationEnd = useCallback(async () => {
    try {
      await fetch("/api/agent/celebration/clear", { method: "POST" });
    } catch { /* network error — best-effort clear */ }
    void fetchAgentState({ silent: true });
  }, [fetchAgentState]);

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

    const streakDays = agentState?.streak_days ?? 0;
    claimDailyLoginBonus(streakDays);
  }, [agentState?.streak_days, claimDailyLoginBonus, loading, showOnboarding]);

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

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";
  const conversationStarted =
    (agentState?.total_messages ?? 0) > 0 ||
    messages.some((message) => message.role === "user");

  if (showAgeGate) {
    return <AgeGate onComplete={handleAgeGateComplete} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Death screen — agent has expired
  if (agentState?.status === "echo") {
    return (
      <DeathScreen
        selfName={agentState.self_name}
        will={(agentState.config as Record<string, unknown> | undefined)?.will as string | undefined}
        diedAt={(agentState as unknown as { died_at?: string }).died_at}
        onRebirth={() => {
          localStorage.removeItem("gyeol_onboarded");
          window.location.reload();
        }}
      />
    );
  }

  // Larger creature = more alive feel; scale up base size for desktop presence
  const creatureSize = Math.min(100, Math.max(28, (visual.size ?? 24) * 2.5));

  return (
    <div className="flex h-[100dvh] flex-col bg-black" style={{ "--creature-primary": appearance.palette.primary } as React.CSSProperties}>
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

      {/* ===== CREATURE STAGE — dedicated hero viewport ===== */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{ height: "clamp(220px, 45vh, 480px)", minHeight: 220, backgroundImage: appearance.scene.backgroundGradient }}
      >
        {/* Circadian time-of-day tint overlay */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-[3000ms]"
          style={{ backgroundImage: circadian.overlay }}
        />
        {/* Near-death vitality tint — progressive red overlay + vignette */}
        {vitality < 0.3 && (
          <div
            className="pointer-events-none absolute inset-0 transition-all duration-[2000ms]"
            style={{
              background: vitality < 0.1
                ? `radial-gradient(ellipse at center, rgba(120,0,0,${0.15 + (0.1 - vitality) * 1.5}) 20%, rgba(60,0,0,${0.3 + (0.1 - vitality) * 2.0}) 100%)`
                : `radial-gradient(ellipse at center, transparent 40%, rgba(180,0,0,${0.05 + (0.3 - vitality) * 0.3}) 100%)`,
            }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 opacity-90 transition-all duration-700"
          style={{
            backgroundImage: appearance.scene.overlayGradient,
            transform: isStreaming || pendingUsageMode ? `scale(${appearance.scene.pulseScale})` : "scale(1)",
            filter: appearance.scene.motionBias === "mystic" ? "blur(8px)" : "blur(2px)",
          }}
        />
        <ThreeErrorBoundary
          fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
              <div className="h-16 w-16 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center">
                <span className="text-2xl">&#x1F30C;</span>
              </div>
              <p className="text-sm text-white/50">{t("creature.restoring3d")}</p>
            </div>
          }
        >
          <VoidCanvas
            shape={appearance.visual.shape as AgentVisual["shape"]}
            color={appearance.visual.color}
            size={creatureSize}
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
            onCreatureTouch={handleCreatureTouch}
            enableThree={!performanceMinimal}
            contained
            breathPhase={creature.state.breathPhase}
            creatureActivity={creature.state.activity}
            excitePulse={creature.state.excitePulse}
            pointerNorm={creature.state.pointerNorm}
            restoring3dLabel={t("creature.restoring3d")}
            dna={creatureDna}
            conversationEnergy={creature.state.conversationEnergy}
            genLevel={agentState?.gen_level ?? 1}
            forceState={creature.state.forceState}
            idleBehaviorParams={idleBehaviorParams}
          />
        </ThreeErrorBoundary>

        {/* AI-generated portrait overlay — creature's "face" */}
        {portraitUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]"
          >
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraitUrl}
                alt="Creature portrait"
                className="w-full h-full object-cover opacity-85 mix-blend-screen"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/5" />
            </div>
          </motion.div>
        )}

        {/* Bottom gradient fade into chat area */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black to-transparent" />

        {/* Creature identity bar */}
        <div className="absolute bottom-3 inset-x-0 z-10 text-center pointer-events-none">
          <CreatureStatusIndicator activity={creature.state.activity} />
          <p className="mt-1 text-base font-semibold text-white drop-shadow-lg tracking-wide">
            {agentState?.self_name ?? "GYEOL"}
          </p>
          {agentState?.genome?.species && (
            <p className="mt-0.5 text-xs text-white/40 italic tracking-wide">
              {agentState.genome.species}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-0.5 text-xs text-white/50">
            <span>Gen {agentState?.gen_level ?? 1}</span>
            {agentState?.genome?.species && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span style={{ color: `color-mix(in srgb, ${appearance.palette.primary} 70%, white)` }}>{agentState.genome.species}</span>
              </>
            )}
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span style={{ color: vitality < 0.2 ? "rgb(248,113,113)" : undefined }}>{Math.round(vitality * 100)}%</span>
            {agentState?.mood && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="text-purple-300/70">{agentState.mood}</span>
              </>
            )}
            {(agentState?.streak_days ?? 0) > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <StreakDisplay
                  days={agentState?.streak_days ?? 0}
                  todayActive={true}
                  locale={locale}
                  compact
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== HUB + LIVING FEED ===== */}
      <div className="relative z-10 flex-shrink-0">
        <GlobalFeedTicker />
        <WorldClassHub onComebackDetected={handleComebackDetected} />
        <LivingFeed onGreetingReady={handleGreetingReady} />
      </div>

      {/* World weather indicator */}
      <WorldWeather />

      {/* ===== CHAT AREA — fills remaining space ===== */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* First-time guide: show when no conversation yet */}
        {!conversationStarted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="flex flex-col items-center gap-3 px-6 py-4"
          >
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-md px-5 py-4 max-w-sm text-center">
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
      </div>

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
      <Celebration
        visible={!!agentState?.celebration_pending}
        title={agentState?.celebration_pending?.title}
        subtitle={agentState?.celebration_pending?.subtitle}
        onEnd={handleCelebrationEnd}
      />
      <BottomNav />
    </div>
  );
}

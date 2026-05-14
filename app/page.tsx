"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import { useChatStore } from "@/store/chat-store";
import { useCelebrationStore } from "@/store/celebration-store";
import { useTranslations } from "@/components/i18n-provider";
const Soundscape = dynamic(() => import("@/components/soundscape"), { ssr: false, loading: () => null });
import { RewardToast } from "@/components/reward-toast";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useCreatureState } from "@/hooks/use-creature-state";
import { useCreatureDna } from "@/hooks/use-creature-dna";
import { useCreatureLife } from "@/hooks/use-creature-life";
import { deriveEmotionMood, getEmotionSoundProfile } from "@/lib/soundscape/emotion-map";
import { getCircadianTint } from "@/lib/circadian";
import { deriveDNATheme, applyDNAThemeToRoot } from "@/lib/theme/dna-theme";
import { deriveVoiceParams } from "@/lib/genome/voice-synth";
import { deriveSpecies } from "@/lib/genome/species";
import { haptic } from "@/lib/micro-interactions";
import { getIdleBehaviorParams } from "@/lib/creature/idle-behaviors";
import { motion } from "framer-motion";
import { AgeGate } from "@/components/age-gate";
const Onboarding = dynamic(() => import("@/components/onboarding").then((m) => ({ default: m.Onboarding })), {
  ssr: false,
  loading: () => <div className="h-full" />,
});
const DeathScreen = dynamic(() => import("@/components/death-screen").then((m) => ({ default: m.DeathScreen })), {
  ssr: false,
  loading: () => null,
});
import { CreatureGrowthPulse, CreatureStatusIndicator } from "@/components/creature-status";
import { CreatureTapReact } from "@/components/effects/creature-tap";
import { markAgeGateCompleted, readAgeGateCompleted } from "@/lib/safety/age-gate";
import { useShouldShowTutorial, TutorialOverlay } from "@/components/tutorial-overlay";
import { mainTutorialSteps } from "@/components/tutorial-steps";
import { DailyLoginBonus } from "@/components/daily-login-bonus";
import { ConversationStarter } from "@/components/conversation-starter";
import { CoreLoopPanel } from "@/components/core-loop-panel";
import { deriveEvolutionSummary } from "@/lib/identity/evolution-copy";
import { translateVisibleLifeSignal } from "@/lib/creature-life/visible-signals";

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
import { ThreeErrorBoundary } from "@/components/three-error-boundary";
const Celebration = dynamic(() => import("@/components/celebration"), { ssr: false, loading: () => null });
import { PortraitGenerateButton } from "@/components/portrait-generate-button";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import type { AgentVisual } from "@/types/agent";
import { shouldDropMysteryBox, generateMysteryBox, addPendingBox, popPendingBox, type MysteryBox as MysteryBoxType } from "@/lib/engagement/mystery-box";
const MysteryBoxOverlay = dynamic(() => import("@/components/mystery-box-overlay").then((m) => ({ default: m.MysteryBoxOverlay })), { ssr: false, loading: () => null });

export default function Home() {
  const { locale, t } = useTranslations();
  const showTutorial = useShouldShowTutorial();
  const { agentState, engagement, loading, error, fetchAgentState, evolutionEvent, clearEvolution } = useAgentStore();
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | null ?? null;
  useCreatureDna(agentId);
  const { visibleSignal: creatureLifeSignal, recordTouch: recordCreatureLifeTouch } = useCreatureLife(agentId);
  const creatureLifeSignalLabel = useMemo(
    () => translateVisibleLifeSignal(creatureLifeSignal, locale),
    [creatureLifeSignal, locale],
  );
  const { fetchWorldState } = useWorldStore();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const pendingUsageMode = useChatStore((s) => s.pendingUsageMode);
  const claimDailyLoginBonus = useChatStore((s) => s.claimDailyLoginBonus);
  const historyLoaded = useChatStore((s) => s.historyLoaded);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [activeMysteryBox, setActiveMysteryBox] = useState<MysteryBoxType | null>(null);
  const sessionMsgCountRef = useRef(0);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [bonusDayIndex, setBonusDayIndex] = useState(1);
  const [bonusAlreadyClaimed, setBonusAlreadyClaimed] = useState(false);
  const [petCountToday, setPetCountToday] = useState(0);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
  }, [fetchAgentState, fetchWorldState]);

  // Fetch daily bonus status — show modal if not yet claimed today
  useEffect(() => {
    fetch("/api/home/daily-bonus")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setBonusDayIndex(d.currentDayIndex ?? 1);
        setBonusAlreadyClaimed(!!d.alreadyClaimed);
        if (!d.alreadyClaimed) setShowDailyBonus(true);
      })
      .catch(() => {});
  }, []);

  // Fetch latest portrait — runs once when agent first loads.
  // If none exists yet, auto-generate one in the background so the
  // user sees a proper character image instead of a placeholder blob.
  const portraitFetchedRef = useRef(false);
  const [portraitGenerating, setPortraitGenerating] = useState(false);
  useEffect(() => {
    if (!agentState || portraitFetchedRef.current) return;
    portraitFetchedRef.current = true;
    fetch("/api/creature/portrait", { signal: AbortSignal.timeout(8000) })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.portraits?.length) {
          try {
            const latest = JSON.parse(data.portraits[0].content);
            if (latest?.image) {
              setPortraitUrl(latest.image);
              return;
            }
          } catch { /* fall through to auto-generate */ }
        }
        // No portrait exists yet — auto-generate the hero character image.
        setPortraitGenerating(true);
        return fetch("/api/creature/portrait", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: "portrait" }),
          signal: AbortSignal.timeout(60_000),
        })
          .then((r) => r.ok ? r.json() : null)
          .then((genData) => {
            if (genData?.url) setPortraitUrl(genData.url);
          })
          .catch(() => { /* silent — user can retry via button */ })
          .finally(() => setPortraitGenerating(false));
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

  // DNA-driven voice hint for Soundscape synth
  const voiceHint = useMemo(() => {
    if (!creatureDna) return null;
    const species = deriveSpecies(creatureDna);
    const vp = deriveVoiceParams(creatureDna, species);
    return {
      baseFreq: vp.baseFreq,
      timbre: vp.timbre,
      attack: vp.attack,
      decay: vp.decay,
      sustain: vp.sustain,
      release: vp.release,
      vibratoRate: vp.vibratoRate,
      vibratoDepth: vp.vibratoDepth,
    };
  }, [creatureDna]);

  const sendMessage = useChatStore((s) => s.sendMessage);
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
          sessionMsgCountRef.current += 1;
          // Mystery box drop check — defer setState to avoid
          // synchronous setState-in-effect lint error
          if (shouldDropMysteryBox({
            messageCount: agentState?.total_messages ?? 0,
            streakDays: agentState?.streak_days ?? 0,
            sessionMessageCount: sessionMsgCountRef.current,
          })) {
            const box = generateMysteryBox(undefined, agentState?.streak_days ?? 0);
            addPendingBox(box);
            queueMicrotask(() => setActiveMysteryBox(box));
          }
          break;
        }
      }
    }
  }, [messages, creature, historyLoaded, agentState?.total_messages, agentState?.streak_days]);

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
    setPetCountToday((prev) => prev + 1);
    recordCreatureLifeTouch(affinityDelta >= 0.3 ? "long" : "light");
    // Haptic feedback varies by touch intensity
    if (affinityDelta >= 0.3) haptic("success");
    else if (affinityDelta >= 0.1) haptic("send");
  }, [creature, recordCreatureLifeTouch]);

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
  const [preferredName, setPreferredName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("gyeol_custom_name");
    } catch {
      return null;
    }
  });
  const [showAgeGate, setShowAgeGate] = useState(() => {
    if (typeof window === "undefined") return false;
    return !readAgeGateCompleted();
  });
  const creatureName = preferredName ?? agentState?.self_name ?? "결";
  const personalityMode =
    typeof (agentState?.config as Record<string, unknown> | undefined)?.personality_mode === "string"
      ? ((agentState?.config as Record<string, unknown>).personality_mode as string)
      : null;
  const recentMemory = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && typeof message.memoryMoment?.memory === "string")
    ?.memoryMoment?.memory ?? null;
  const growthPulse = useMemo(() => {
    const latest = [...messages].reverse().find((message) => message.role === "assistant" && (message.memoryMoment || (message.dnaShift?.length ?? 0) > 0 || (message.traitEmerged?.length ?? 0) > 0));
    if (!latest) return null;
    return deriveEvolutionSummary({
      hasMemoryMoment: !!latest.memoryMoment,
      dnaShift: latest.dnaShift,
      traitEmerged: latest.traitEmerged,
    });
  }, [messages]);

  const handleOnboardingComplete = useCallback(
    async (payload?: { personalityMode?: string; preferredName?: string }) => {
      localStorage.setItem("gyeol_onboarded", "1");
      // Arm the first-conversation celebration — fires once the user sends
      // their very first message (tracked in the useEffect below).
      try {
        localStorage.setItem("gyeol_awaiting_first_reward", "1");
      } catch { /* quota */ }
      if (payload?.preferredName) {
        try {
          localStorage.setItem("gyeol_custom_name", payload.preferredName);
        } catch {}
        setPreferredName(payload.preferredName);
      }
      setShowOnboarding(false);
      if (payload?.personalityMode) {
        try {
          await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personality_mode: payload.personalityMode }),
          });
          await fetchAgentState({ silent: true });
        } catch {
          // Best-effort; onboarding should still proceed even if save fails
        }
      }
    },
    [fetchAgentState],
  );

  // First-conversation magic moment — the onboarding→reward linkage that the
  // v3 benchmark analysis flagged as missing. When a user finishes onboarding
  // (or returns after completing it in a previous session) and then crosses
  // the 0→1 message threshold, fire the global celebration overlay with an
  // XP reward so they immediately feel the game loop kick in.
  const celebrate = useCelebrationStore((s) => s.celebrate);
  const firstRewardFiredRef = useRef(false);
  useEffect(() => {
    if (firstRewardFiredRef.current) return;
    if (loading || showOnboarding) return;
    const totalMessages = agentState?.total_messages ?? 0;
    if (totalMessages < 1) return;
    let pending = false;
    try {
      pending = localStorage.getItem("gyeol_awaiting_first_reward") === "1";
    } catch { /* private mode */ }
    if (!pending) return;
    firstRewardFiredRef.current = true;
    try {
      localStorage.removeItem("gyeol_awaiting_first_reward");
    } catch { /* ignore */ }
    haptic("success");
    const memoryLine = recentMemory
      ? (t("home.firstRewardBody") || `결이 첫 기억을 만들기 시작했어요: ${recentMemory}`)
      : (t("home.firstRewardBody") || "오늘의 돌봄이 완료됐어요. 결이 당신을 기억하기 시작했어요.");
    celebrate({
      title: t("home.firstRewardTitle") || "오늘의 돌봄 완료",
      subtitle: memoryLine,
      reward: { type: "badge", amount: 1, icon: "🫶" },
      variant: "firework",
      autoDismissMs: 4000,
    });
  }, [agentState?.total_messages, loading, showOnboarding, celebrate, t, recentMemory]);

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
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-all duration-1000" role="status" aria-label={t("common.awakening")}>
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
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 px-6" role="alert">
        <div className="w-16 h-16 rounded-full border border-red-400/30 bg-red-400/10 flex items-center justify-center mb-6" aria-hidden="true">
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
          className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
  const dailyCareCompleted = conversationStarted && petCountToday > 0 && vitality >= 0.7;

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

  // Larger creature = more alive feel. Appendages (horns, tails, antennae)
  // need presence on screen — a 100px cap turns everything back into a blob.
  const creatureSize = Math.min(200, Math.max(56, (visual.size ?? 24) * 4));

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

      {/* ===== CREATURE STAGE — minimalist fullscreen hero ===== */}
      <CreatureTapReact className="relative flex-1 min-h-0">
      <div
        data-tutorial="creature"
        className="relative h-full overflow-hidden"
        style={{ backgroundImage: appearance.scene.backgroundGradient }}
      >
        {/* Ambient sky gradient (Apple Weather-style) — subtle full-gradient base layer */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] transition-all duration-[5000ms]"
          style={{ backgroundImage: circadian.skyGradient }}
        />
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
        {/* When an AI portrait is present, unmount the 3D creature entirely.
            Previously we just faded opacity, which left Three.js rendering and
            caused a visible overlap during the 1200ms fade. Unmounting is both
            cheaper and strictly mutually-exclusive with the portrait. */}
        {!portraitUrl && (
          <div className="absolute inset-0">
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
                idleBehavior={creature.state.idleActivity}
              />
            </ThreeErrorBoundary>
          </div>
        )}

        {/* AI-generated portrait — HERO character visual. */}
        {portraitUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 flex items-end justify-center pointer-events-none z-[2] pb-20"
          >
            <div
              className="relative aspect-square overflow-hidden rounded-[28%] border border-white/15 shadow-2xl shadow-black/60"
              style={{
                height: "min(72%, 320px)",
                boxShadow: `0 0 48px color-mix(in srgb, ${appearance.palette.primary} 40%, transparent), 0 20px 60px rgba(0,0,0,0.5)`,
              }}
            >
              <Image
                src={portraitUrl}
                alt="Creature portrait"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 280px, 320px"
                priority
              />
              {/* Soft inner ring for polish */}
              <div className="absolute inset-0 rounded-[28%] ring-1 ring-inset ring-white/10 pointer-events-none" />
              {/* Bottom gradient to let name/stats pop off the frame */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none rounded-b-[28%]" />
            </div>
          </motion.div>
        )}

        {!portraitUrl && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[3] flex items-end justify-center pb-20 pointer-events-none"
          >
            <div className="relative w-[240px] rounded-[32px] border border-white/20 bg-black/55 p-5 text-center shadow-2xl backdrop-blur-md">
              <div className="absolute -inset-8 -z-10 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${appearance.palette.primary}55 0%, transparent 70%)` }} />
              <div className="text-6xl">🥚</div>
              <p className="mt-2 text-sm font-semibold text-white">{creatureName}</p>
              <p className="mt-1 text-xs text-white/65">{t("home.firstTimeGuide") || "대화하면 기억이 쌓여요"}</p>
            </div>
          </motion.div>
        )}

        {/* Portrait status — auto-generating on first load, or manual retry */}
        {!portraitUrl && agentState && (
          portraitGenerating ? (
            <div className="absolute bottom-24 inset-x-0 z-[3] flex flex-col items-center pointer-events-none">
              <div className="rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-4 py-2 text-xs font-medium text-white/90 shadow-lg shadow-black/40 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-ping" />
                <span>{t("creature.generatingPortrait") ?? "Generating portrait..."}</span>
              </div>
            </div>
          ) : (
            <PortraitGenerateButton
              onGenerated={(url) => setPortraitUrl(url)}
              label={t("creature.generatePortrait") ?? "AI 초상화 생성"}
            />
          )
        )}

        {/* Bottom gradient fade into chat area */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black to-transparent" />

        {/* Minimalist creature identity — name + mood only */}
        <div className="absolute bottom-4 inset-x-0 z-10 text-center pointer-events-none">
          <CreatureStatusIndicator activity={creature.state.activity} />
          <CreatureGrowthPulse locale={locale} summary={growthPulse} />
          {creatureLifeSignalLabel && (
            <p className="mx-auto mt-1 w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] text-white/65">
              {creatureLifeSignalLabel}
            </p>
          )}
            <p className="mt-1 text-lg font-medium text-white drop-shadow-lg tracking-wide">
            {creatureName}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1 text-xs text-white/40">
            {agentState?.mood && (
              <>
                <span className="text-white/50">{agentState.mood}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
              </>
            )}
            <span style={{ color: vitality < 0.2 ? "rgb(248,113,113)" : undefined }}>
              {Math.round(vitality * 100)}%
            </span>
          </div>
        </div>
      </div>
      </CreatureTapReact>

      <CoreLoopPanel
        locale={locale}
        name={creatureName}
        mood={agentState?.mood ?? null}
        vitality={vitality}
        streakDays={engagement?.currentStreak ?? agentState?.streak_days ?? 0}
        totalMessages={agentState?.total_messages ?? 0}
        genLevel={agentState?.gen_level ?? 1}
        evolutionProgress={agentState?.progress}
        intimacyScore={agentState?.intimacy_score}
        conversationStarted={conversationStarted}
        recentMemory={recentMemory}
        petCountToday={petCountToday}
        dailyCareCompleted={dailyCareCompleted}
      />

      {/* ===== CHAT AREA — compact bottom section ===== */}
      <div className="relative z-10 flex flex-col flex-shrink-0" style={{ height: "clamp(160px, 30vh, 320px)" }}>
        {/* First-time guide: show when no conversation yet */}
        {!conversationStarted && (
          <div className="flex flex-col items-center gap-2 px-6 py-3">
            <p className="text-sm text-white/60 text-center">
              {t("home.firstTimeGuide") || "내 결 키우기: 오늘 한 번 대화하면 기억이 생겨요."}
            </p>
            <ConversationStarter
              creatureName={creatureName}
              locale={locale}
              personality={personalityMode}
              onSelect={(text) => sendMessage(text)}
            />
          </div>
        )}

        <div className="flex-1 min-h-0">
          <ChatPanel navVisible={conversationStarted} />
        </div>
      </div>

      <Soundscape
        enabled={!performanceMinimal}
        soundProfile={soundProfile}
        label={appearance.sound.label}
        accentColor={appearance.palette.primary}
        voiceHint={voiceHint}
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
      {activeMysteryBox && (
        <MysteryBoxOverlay
          box={activeMysteryBox}
          onClose={() => {
            popPendingBox();
            setActiveMysteryBox(null);
          }}
        />
      )}
      {/* Daily login bonus modal */}
      {showDailyBonus && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowDailyBonus(false)}
        >
          <motion.div
            className="w-full max-w-sm pb-2 relative"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-8 right-0 text-white/40 hover:text-white/70 text-sm"
              onClick={() => setShowDailyBonus(false)}
            >
              {t("common.close") || "닫기"}
            </button>
            <DailyLoginBonus
              currentDayIndex={bonusDayIndex}
              alreadyClaimed={bonusAlreadyClaimed}
              locale={locale}
              onClaim={async () => {
                await fetch("/api/home/daily-bonus", { method: "POST" });
                setBonusAlreadyClaimed(true);
                setTimeout(() => setShowDailyBonus(false), 2000);
              }}
            />
          </motion.div>
        </motion.div>
      )}
      <BottomNav />
      {showTutorial && (
        <TutorialOverlay
          steps={mainTutorialSteps}
          onComplete={() => {}}
          storageKey="gyeol_tutorial_done"
        />
      )}
    </div>
  );
}

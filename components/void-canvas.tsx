"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { CreatureActivity } from "@/hooks/use-creature-state";
import { useDevicePerformance } from "@/hooks/use-device-performance";

interface VoidCanvasProps {
  shape?: "dot" | "sphere" | "polygon" | "complex" | "transcendent" | "creature" | "humanoid" | "beast" | "amorphous" | "seraph";
  color?: string;
  size?: number;
  glow?: number;
  animation?: "float" | "pulse-fast" | "breathe-slow";
  particles?: number;
  background?: string;
  vitality?: number;
  mood?: string;
  isListening?: boolean;
  motionBias?: "gentle" | "kinetic" | "mystic";
  pulseScale?: number;
  onTap?: () => void;
  enableThree?: boolean;
  /** Creature breathing phase 0..1 */
  breathPhase?: number;
  /** Creature activity state */
  creatureActivity?: CreatureActivity;
  /** Excitement pulse 0..1 */
  excitePulse?: number;
  /** Normalized pointer for eye tracking */
  pointerNorm?: { x: number; y: number };
}

const VoidCanvasInner = dynamic(
  () => import("./void-canvas-inner").then((m) => m.VoidCanvasInner),
  { ssr: false },
);

function CssVoidFallback({
  color,
  size,
  glow,
  vitality,
  isListening,
  motionBias,
  pulseScale,
  onTap,
  breathPhase = 0,
  creatureActivity = "awake" as CreatureActivity,
  excitePulse = 0,
}: {
  color: string;
  size: number;
  glow: number;
  vitality: number;
  isListening: boolean;
  motionBias: "gentle" | "kinetic" | "mystic";
  pulseScale: number;
  onTap?: () => void;
  breathPhase?: number;
  creatureActivity?: CreatureActivity;
  excitePulse?: number;
}) {
  const secondaryColor = useMemo(() => {
    const raw = color.replace("#", "");
    const normalized = raw.length === 3
      ? raw.split("").map((char) => `${char}${char}`).join("")
      : raw.padEnd(6, "0").slice(0, 6);
    const value = Number.parseInt(normalized, 16);
    const r = Math.min(255, ((value >> 16) & 0xff) + 35);
    const g = Math.min(255, ((value >> 8) & 0xff) + 20);
    const b = Math.min(255, (value & 0xff) + 55);
    return `rgb(${r}, ${g}, ${b})`;
  }, [color]);

  // Organic breathing — sine wave + heartbeat double-bump
  const breathSin = Math.sin(breathPhase * Math.PI * 2);
  const heartbeat = Math.pow(Math.max(0, Math.sin(breathPhase * Math.PI * 4)), 3) * 0.03;
  const breathScale = 1 + breathSin * 0.06 + heartbeat + excitePulse * 0.15;

  // Activity dimming — sleeping creatures fade, drowsy ones dim
  const activityDim = creatureActivity === "sleeping" ? 0.35 : creatureActivity === "drowsy" ? 0.6 : 1;
  const activitySpeed = creatureActivity === "sleeping" ? 0.3 : creatureActivity === "drowsy" ? 0.6 : 1;

  const effectiveScale = (isListening ? 1.05 : 1) * pulseScale * breathScale;
  const motionDuration = motionBias === "kinetic" ? 8 : motionBias === "mystic" ? 18 : 12;
  const adjustedDuration = motionDuration / activitySpeed;
  const motionClass = motionBias === "kinetic"
    ? `animate-[voidOrbitFast_${adjustedDuration}s_linear_infinite]`
    : motionBias === "mystic"
      ? `animate-[voidOrbitSlow_${adjustedDuration}s_linear_infinite]`
      : `animate-[voidOrbit_${adjustedDuration}s_linear_infinite]`;

  // Glow intensity pulses with breathing
  const breathGlow = glow * (0.8 + breathSin * 0.2) * activityDim;
  const effectiveOpacity = Math.max(0.45, vitality) * activityDim;
  const coreOpacity = Math.max(0.65, vitality) * activityDim;

  return (
    <div
      onPointerDown={onTap}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: size * 7,
            height: size * 7,
            transform: `scale(${effectiveScale})`,
            transition: "transform 80ms ease-out",
          }}
        >
          {/* Ambient glow — breathes with the creature */}
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 70%)`,
              opacity: 0.25 + breathSin * 0.1 * activityDim,
            }}
          />
          {/* Orbit ring */}
          <div
            className={`absolute left-1/2 top-1/2 rounded-full ${motionClass}`}
            style={{
              width: size * 4.2,
              height: size * 4.2,
              transform: "translate(-50%, -50%)",
              border: `1px solid ${secondaryColor}30`,
              boxShadow: `0 0 ${breathGlow}px ${color}25 inset`,
            }}
          />
          {/* Mid glow layer */}
          <div
            className="absolute left-1/2 top-1/2 rounded-full blur-xl"
            style={{
              width: size * 2.2,
              height: size * 2.2,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, ${color} 0%, ${secondaryColor} 55%, transparent 75%)`,
              opacity: effectiveOpacity,
              boxShadow: `0 0 ${breathGlow}px ${color}`,
            }}
          />
          {/* Core — bright center */}
          <div
            className={`absolute left-1/2 top-1/2 rounded-full ${isListening ? "animate-pulse" : ""}`}
            style={{
              width: size * 1.3,
              height: size * 1.3,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, #ffffff 0%, ${color} 60%, transparent 80%)`,
              opacity: coreOpacity,
            }}
          />
          {/* Sleeping ZZZ overlay */}
          {creatureActivity === "sleeping" && (
            <div
              className="absolute left-1/2 top-1/4 -translate-x-1/2 animate-[floatUp_3s_ease-in-out_infinite]"
              style={{ fontSize: size * 0.4, opacity: 0.4 }}
            >
              💤
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VoidCanvas({
  shape = "sphere",
  color = "#6366f1",
  size = 30,
  glow = 60,
  animation = "float",
  particles = 12,
  background = "#000000",
  vitality = 1,
  mood = "",
  isListening = false,
  motionBias = "gentle",
  pulseScale = 1,
  onTap,
  enableThree = false,
  breathPhase,
  creatureActivity,
  excitePulse,
  pointerNorm,
}: VoidCanvasProps) {
  void mood;
  const { isMobile, reducedVisualMode } = useDevicePerformance();
  const particleCount = reducedVisualMode ? 0 : isMobile ? Math.floor(particles / 2) : particles;
  const effectiveGlow = reducedVisualMode ? Math.min(glow, 35) : glow;
  const effectiveSize = reducedVisualMode ? Math.min(size, 24) : size;
  const [shouldRenderThree, setShouldRenderThree] = useState(false);

  useEffect(() => {
    if (!enableThree || reducedVisualMode || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const activate = () => {
      if (!cancelled) {
        setShouldRenderThree(true);
      }
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(activate, { timeout: 1600 });
    } else {
      timeoutId = setTimeout(activate, 900);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enableThree, reducedVisualMode]);

  const shouldUseThree = enableThree && !reducedVisualMode && shouldRenderThree;

  return (
    <div className="fixed inset-0 z-0" style={{ backgroundColor: background }}>
      {shouldUseThree ? (
        <VoidCanvasInner
          shape={shape}
          color={color}
          size={effectiveSize}
          glow={effectiveGlow}
          animation={animation}
          particles={particleCount}
          vitality={vitality}
          isListening={isListening}
          motionBias={motionBias}
          pulseScale={pulseScale}
          onTap={onTap}
          breathPhase={breathPhase}
          creatureActivity={creatureActivity}
          excitePulse={excitePulse}
          pointerNorm={pointerNorm}
        />
      ) : (
        <CssVoidFallback
          color={color}
          size={effectiveSize}
          glow={effectiveGlow}
          vitality={vitality}
          isListening={isListening}
          motionBias={motionBias}
          pulseScale={pulseScale}
          onTap={onTap}
          breathPhase={breathPhase}
          creatureActivity={creatureActivity}
          excitePulse={excitePulse}
        />
      )}
    </div>
  );
}

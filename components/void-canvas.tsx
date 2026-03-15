"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

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
}: {
  color: string;
  size: number;
  glow: number;
  vitality: number;
  isListening: boolean;
  motionBias: "gentle" | "kinetic" | "mystic";
  pulseScale: number;
  onTap?: () => void;
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

  const effectiveScale = (isListening ? 1.05 : 1) * pulseScale;
  const motionClass = motionBias === "kinetic"
    ? "animate-[voidOrbitFast_8s_linear_infinite]"
    : motionBias === "mystic"
      ? "animate-[voidOrbitSlow_18s_linear_infinite]"
      : "animate-[voidOrbit_12s_linear_infinite]";

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
            transition: "transform 220ms ease-out",
          }}
        >
          <div
            className="absolute inset-0 rounded-full opacity-35 blur-3xl"
            style={{
              background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 70%)`,
            }}
          />
          <div
            className={`absolute left-1/2 top-1/2 rounded-full ${motionClass}`}
            style={{
              width: size * 4.2,
              height: size * 4.2,
              transform: "translate(-50%, -50%)",
              border: `1px solid ${secondaryColor}30`,
              boxShadow: `0 0 ${glow}px ${color}25 inset`,
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 rounded-full blur-xl"
            style={{
              width: size * 2.2,
              height: size * 2.2,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, ${color} 0%, ${secondaryColor} 55%, transparent 75%)`,
              opacity: Math.max(0.45, vitality),
              boxShadow: `0 0 ${glow}px ${color}`,
            }}
          />
          <div
            className={`absolute left-1/2 top-1/2 rounded-full ${isListening ? "animate-pulse" : ""}`}
            style={{
              width: size * 1.3,
              height: size * 1.3,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, #ffffff 0%, ${color} 60%, transparent 80%)`,
              opacity: Math.max(0.65, vitality),
            }}
          />
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
}: VoidCanvasProps) {
  void mood;
  const isMobile = typeof navigator !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const lowConcurrency = typeof navigator !== "undefined" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const lowMemory = typeof navigator !== "undefined" && "deviceMemory" in navigator && Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const saveData =
    typeof navigator !== "undefined" &&
    "connection" in navigator &&
    Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const slowNetwork =
    typeof navigator !== "undefined" &&
    "connection" in navigator &&
    /2g|3g/i.test((navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? "");
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reducedVisualMode = prefersReducedMotion || lowConcurrency || lowMemory || saveData || slowNetwork;
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
        />
      )}
    </div>
  );
}

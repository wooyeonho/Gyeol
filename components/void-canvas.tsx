"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

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
}

const VoidCanvasInner = dynamic(
  () => import("./void-canvas-inner").then((m) => m.VoidCanvasInner),
  { ssr: false }
);

/**
 * CSS-only fallback for devices that can't handle Three.js:
 * - deviceMemory <= 2GB
 * - hardwareConcurrency <= 2
 * - prefers-reduced-motion
 * Renders a glowing orb with CSS animations instead of WebGL.
 */
function CSSFallbackCanvas({
  color,
  size,
  glow,
  animation,
  vitality,
  background,
  isListening,
  onTap,
}: Pick<VoidCanvasProps, "color" | "size" | "glow" | "animation" | "vitality" | "background" | "isListening" | "onTap">) {
  const orbSize = Math.max(40, Math.min((size ?? 30) * 2.5, 120));
  const opacity = Math.max(0.3, vitality ?? 1);
  const animDuration = animation === "pulse-fast" ? "1.5s" : animation === "breathe-slow" ? "4s" : "3s";
  const glowRadius = Math.min((glow ?? 60) * 0.8, 60);
  const scale = isListening ? 1.1 : 1;

  return (
    <div
      className="fixed inset-0 z-0 flex items-center justify-center"
      style={{ backgroundColor: background }}
      onClick={onTap}
      role="presentation"
    >
      <div
        style={{
          width: orbSize,
          height: orbSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}cc, ${color}44, transparent)`,
          boxShadow: `0 0 ${glowRadius}px ${color}66, 0 0 ${glowRadius * 2}px ${color}22`,
          opacity,
          transform: `scale(${scale})`,
          animation: `void-canvas-pulse ${animDuration} ease-in-out infinite`,
          transition: "transform 0.3s ease",
          cursor: onTap ? "pointer" : "default",
        }}
      />
      <style>{`
        @keyframes void-canvas-pulse {
          0%, 100% { transform: scale(${scale}) translateY(0); }
          50% { transform: scale(${scale * 1.06}) translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

function shouldUseCSSFallback(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return true;

  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return true;

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === "number" && memory <= 2) return true;

  return false;
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
}: VoidCanvasProps) {
  void mood;
  const [useFallback] = useState(() => shouldUseCSSFallback());

  if (useFallback) {
    return (
      <CSSFallbackCanvas
        color={color}
        size={size}
        glow={glow}
        animation={animation}
        vitality={vitality}
        background={background}
        isListening={isListening}
        onTap={onTap}
      />
    );
  }

  const isMobile = typeof navigator !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const lowConcurrency = typeof navigator !== "undefined" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const lowMemory = typeof navigator !== "undefined" && "deviceMemory" in navigator && Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const reducedVisualMode = lowConcurrency || lowMemory;
  const particleCount = reducedVisualMode ? 0 : isMobile ? Math.floor(particles / 2) : particles;
  const effectiveGlow = reducedVisualMode ? Math.min(glow, 35) : glow;
  const effectiveSize = reducedVisualMode ? Math.min(size, 24) : size;

  return (
    <div className="fixed inset-0 z-0" style={{ backgroundColor: background }}>
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
    </div>
  );
}

"use client";

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
  const isMobile = typeof navigator !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const lowConcurrency = typeof navigator !== "undefined" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const lowMemory = typeof navigator !== "undefined" && "deviceMemory" in navigator && Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reducedVisualMode = prefersReducedMotion || lowConcurrency || lowMemory;
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

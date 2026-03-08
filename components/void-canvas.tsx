"use client";

import dynamic from "next/dynamic";

interface VoidCanvasProps {
  shape?: "dot" | "sphere" | "polygon" | "complex" | "transcendent";
  color?: string;
  size?: number;
  glow?: number;
  animation?: "float" | "pulse-fast" | "breathe-slow";
  particles?: number;
  background?: string;
  vitality?: number;
  mood?: string;
  isListening?: boolean;
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
}: VoidCanvasProps) {
  const isMobile = typeof navigator !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const particleCount = isMobile ? Math.floor(particles / 2) : particles;

  return (
    <div className="fixed inset-0 z-0" style={{ backgroundColor: background }}>
      <VoidCanvasInner
        shape={shape}
        color={color}
        size={size}
        glow={glow}
        animation={animation}
        particles={particleCount}
        vitality={vitality}
        isListening={isListening}
      />
    </div>
  );
}

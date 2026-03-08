"use client";

import dynamic from "next/dynamic";

const VoidCanvasInner = dynamic(() => import("./void-canvas-inner"), { ssr: false });

export type VoidCanvasShape = "dot" | "sphere" | "polygon" | "complex" | "transcendent";
export type VoidCanvasAnimation = "float" | "pulse-fast" | "breathe-slow";

type VoidCanvasProps = {
  shape?: VoidCanvasShape;
  color?: string;
  size?: number;
  glow?: number;
  animation?: VoidCanvasAnimation;
  particles?: number;
  background?: string;
  vitality?: number;
  mood?: string;
  isListening?: boolean;
};

const defaultColor = "#a0a0ff";
const defaultBg = "#000000";

export default function VoidCanvas({
  shape = "sphere",
  color = defaultColor,
  size = 24,
  glow = 60,
  animation = "float",
  particles = 20,
  background = defaultBg,
  vitality = 1,
  isListening = false,
}: VoidCanvasProps) {
  const particleCount = typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent)
    ? Math.floor(particles / 2)
    : particles;
  const opacity = vitality >= 0.5 ? 1 : vitality >= 0.1 ? 0.5 + vitality : 0.3;

  return (
    <VoidCanvasInner
      shape={shape}
      color={color}
      size={size}
      glow={glow}
      animation={animation}
      particles={particleCount}
      background={background}
      opacity={opacity}
      isListening={isListening}
      vitality={vitality}
    />
  );
}

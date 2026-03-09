"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

type ConnectionInfo = {
  saveData?: boolean;
  effectiveType?: string;
};

type BrowserNavigator = Navigator & {
  connection?: ConnectionInfo;
  deviceMemory?: number;
};

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

function CanvasFallback({ color, lite }: { color: string; lite: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(circle at 50% 45%, ${color}22 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 20%), #000`,
      }}
    >
      <div
        className={`absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
          lite ? "opacity-70" : "opacity-90"
        }`}
        style={{
          background: `radial-gradient(circle, ${color}88 0%, ${color}22 45%, transparent 75%)`,
        }}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 ${
          lite ? "animate-pulse" : ""
        }`}
        style={{ boxShadow: `0 0 80px ${color}33` }}
      />
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
}: VoidCanvasProps) {
  const [canvasMode, setCanvasMode] = useState<"full" | "lite">("lite");
  const [showCanvas, setShowCanvas] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const browserNavigator = navigator as BrowserNavigator;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = browserNavigator.connection;
    const lowPowerDevice =
      (typeof browserNavigator.deviceMemory === "number" && browserNavigator.deviceMemory <= 4) ||
      (typeof browserNavigator.hardwareConcurrency === "number" && browserNavigator.hardwareConcurrency <= 4) ||
      connection?.saveData === true ||
      connection?.effectiveType === "2g" ||
      connection?.effectiveType === "slow-2g";
    let idleId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      if (prefersReducedMotion || lowPowerDevice) {
        setCanvasMode("lite");
        setShowCanvas(false);
        return;
      }

      setCanvasMode("full");
      const idleCallback =
        window.requestIdleCallback ??
        ((callback: IdleRequestCallback) =>
          window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 250));

      idleId = idleCallback(() => setShowCanvas(true)) as number;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if ("cancelIdleCallback" in window && typeof window.cancelIdleCallback === "function" && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else if (typeof idleId === "number") {
        window.clearTimeout(idleId);
      }
    };
  }, []);

  const isMobile = typeof navigator !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const moodParticleBoost = /활기|들뜸|기쁨|행복/.test(mood) ? 2 : 0;
  const particleCount = useMemo(() => {
    const mobileCount = isMobile ? Math.floor((particles + moodParticleBoost) / 2) : particles + moodParticleBoost;
    return canvasMode === "lite" ? Math.min(8, mobileCount) : mobileCount;
  }, [canvasMode, isMobile, moodParticleBoost, particles]);

  return (
    <div className="fixed inset-0 z-0" style={{ backgroundColor: background }} aria-hidden="true">
      <CanvasFallback color={color} lite={canvasMode === "lite"} />
      {canvasMode === "full" && showCanvas && (
        <div className="absolute inset-0 transition-opacity duration-700 ease-out">
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
      )}
    </div>
  );
}

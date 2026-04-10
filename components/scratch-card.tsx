"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ScratchCardProps {
  reward: { label: string; emoji: string; value?: string };
  onRevealed?: () => void;
  locale?: string;
}

const REVEAL_THRESHOLD = 0.65; // 65% scratched = revealed

export function ScratchCard({ reward, onRevealed, locale = "ko" }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [percent, setPercent] = useState(0);
  const isDrawing = useRef(false);
  const isKo = locale === "ko";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill with silver scratch layer
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#9ca3af");
    gradient.addColorStop(0.5, "#d1d5db");
    gradient.addColorStop(1, "#9ca3af");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add "긁어서 확인" text
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isKo ? "긁어서 확인! 🪙" : "Scratch to reveal! 🪙", canvas.width / 2, canvas.height / 2);
  }, [isKo]);

  const getScratchPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const scratch = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getScratchPos(e, canvas);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
    ctx.fill();

    // Check reveal percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const p = transparent / (imageData.width * imageData.height);
    setPercent(p);
    if (p >= REVEAL_THRESHOLD && !revealed) {
      setRevealed(true);
      onRevealed?.();
    }
  }, [revealed, onRevealed]);

  return (
    <div className="relative select-none">
      {/* Reward underneath */}
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border border-amber-400/30 p-8 h-44">
        <span className="text-5xl">{reward.emoji}</span>
        <p className="text-white font-bold text-lg">{reward.label}</p>
        {reward.value && <p className="text-amber-400 text-sm">{reward.value}</p>}
      </div>

      {/* Scratch overlay */}
      <AnimatePresence>
        {!revealed && (
          <motion.canvas
            ref={canvasRef}
            width={300}
            height={176}
            className="absolute inset-0 w-full h-full rounded-2xl scratch-canvas"
            style={{ touchAction: "none" }}
            onMouseDown={() => { isDrawing.current = true; setScratching(true); }}
            onMouseMove={scratch}
            onMouseUp={() => { isDrawing.current = false; setScratching(false); }}
            onMouseLeave={() => { isDrawing.current = false; setScratching(false); }}
            onTouchStart={() => { isDrawing.current = true; setScratching(true); }}
            onTouchMove={scratch}
            onTouchEnd={() => { isDrawing.current = false; setScratching(false); }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Reveal celebration */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <span className="text-4xl">🎉</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress hint */}
      {!revealed && scratching && (
        <div className="absolute bottom-2 right-2 text-[10px] text-white/40 bg-black/40 rounded px-1.5 py-0.5">
          {Math.round(percent * 100)}%
        </div>
      )}
    </div>
  );
}

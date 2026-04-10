"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpinSegment {
  label: string;
  emoji: string;
  color: string;
  probability: number;
}

const DEFAULT_SEGMENTS: SpinSegment[] = [
  { label: "50 코인", emoji: "🪙", color: "#f59e0b", probability: 0.35 },
  { label: "스트릭 쉴드", emoji: "🛡️", color: "#3b82f6", probability: 0.15 },
  { label: "100 XP", emoji: "⚡", color: "#a855f7", probability: 0.25 },
  { label: "희귀 아이템", emoji: "💎", color: "#06b6d4", probability: 0.10 },
  { label: "200 코인", emoji: "💰", color: "#f59e0b", probability: 0.10 },
  { label: "전설 아이템", emoji: "🌟", color: "#ef4444", probability: 0.05 },
];

function pickByProbability(segments: SpinSegment[]): number {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < segments.length; i++) {
    cumulative += segments[i].probability;
    if (rand <= cumulative) return i;
  }
  return segments.length - 1;
}

interface SpinWheelProps {
  segments?: SpinSegment[];
  onResult?: (segment: SpinSegment) => void;
  canSpin?: boolean;
  locale?: string;
}

export function SpinWheel({
  segments = DEFAULT_SEGMENTS,
  onResult,
  canSpin = true,
  locale = "ko",
}: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinSegment | null>(null);
  const isKo = locale === "ko";

  const spin = useCallback(() => {
    if (spinning || !canSpin) return;

    const winIndex = pickByProbability(segments);
    const segAngle = 360 / segments.length;
    // Target: winner centered at top (pointer at top)
    const targetAngle = 360 - (winIndex * segAngle + segAngle / 2);
    const extraSpins = 5 * 360;
    const finalRotation = rotation + extraSpins + targetAngle;

    setSpinning(true);
    setResult(null);
    setRotation(finalRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(segments[winIndex]);
      onResult?.(segments[winIndex]);
    }, 3200);
  }, [spinning, canSpin, segments, rotation, onResult]);

  const segAngle = 360 / segments.length;
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const getPath = (idx: number) => {
    const startAngle = (idx * segAngle - 90) * (Math.PI / 180);
    const endAngle = ((idx + 1) * segAngle - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="text-white/70 text-2xl">▼</div>

      {/* Wheel */}
      <div className="relative" style={{ width: size, height: size }}>
        <motion.svg
          width={size}
          height={size}
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: [0.17, 0.67, 0.12, 0.99] }}
        >
          {segments.map((seg, idx) => {
            const midAngle = (idx * segAngle + segAngle / 2 - 90) * (Math.PI / 180);
            const textR = r * 0.65;
            const tx = cx + textR * Math.cos(midAngle);
            const ty = cy + textR * Math.sin(midAngle);
            const textAngle = idx * segAngle + segAngle / 2;
            return (
              <g key={idx}>
                <path d={getPath(idx)} fill={seg.color} opacity={0.85} stroke="#0a0a0f" strokeWidth="1.5" />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="14"
                  transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                >
                  {seg.emoji}
                </text>
              </g>
            );
          })}
          {/* Center hub */}
          <circle cx={cx} cy={cy} r={18} fill="#0f0f14" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={8} fill="rgba(255,255,255,0.3)" />
        </motion.svg>
      </div>

      {/* Spin button */}
      <motion.button
        onClick={spin}
        disabled={spinning || !canSpin}
        className={`rounded-2xl px-8 py-3 font-bold text-sm transition-colors ${
          canSpin && !spinning
            ? "bg-indigo-500 text-white hover:bg-indigo-400"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        }`}
        whileTap={canSpin && !spinning ? { scale: 0.95 } : {}}
      >
        {spinning
          ? (isKo ? "돌아가는 중..." : "Spinning...")
          : !canSpin
          ? (isKo ? "이미 사용함" : "Already Used")
          : (isKo ? "돌리기!" : "Spin!")}
      </motion.button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="flex flex-col items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 w-full"
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <span className="text-4xl">{result.emoji}</span>
            <p className="text-white font-bold">{result.label}</p>
            <p className="text-white/40 text-xs">{isKo ? "획득!" : "Earned!"} 🎉</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EvolutionCeremonyProps {
  level: number;
  mutation?: string;
  onComplete: () => void;
}

const GEN_NAMES = ["", "태동", "각성", "진화", "초월", "신화", "불멸", "신성"];

function Particle({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * 360;
  const radius = 100 + Math.random() * 80;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random() * 1.5;
  const size = 2 + Math.random() * 4;

  const colors = [
    "#a78bfa", "#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6",
  ];
  const color = colors[index % colors.length];

  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
      animate={{
        x: [0, x * 0.4, x],
        y: [0, y * 0.4, y],
        opacity: [0, 1, 0],
        scale: [0, 1.2, 0.8],
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 0.5,
      }}
      className="absolute left-1/2 top-1/2 rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
    />
  );
}

function Ring({ delay, scale, color }: { delay: number; scale: number; color: string }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, scale, scale * 1.6],
        opacity: [0, 0.6, 0],
      }}
      transition={{
        duration: 2.5,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 0.3,
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
      style={{
        width: 80,
        height: 80,
        borderColor: color,
        borderWidth: 1.5,
      }}
    />
  );
}

export function EvolutionCeremony({ level, mutation, onComplete }: EvolutionCeremonyProps) {
  const audioRef = useRef<{ close?: () => void } | null>(null);

  useEffect(() => {
    const t = setTimeout(onComplete, 4500);
    return () => {
      clearTimeout(t);
      if (audioRef.current?.close) audioRef.current.close();
    };
  }, [onComplete]);

  const genName = GEN_NAMES[Math.min(level, GEN_NAMES.length - 1)] || `Gen ${level}`;
  const particleCount = 32;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(0,0,0,0.95)" }}
      >
        {/* Background radial gradient pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.35, 0.15], scale: [0.5, 2.5, 3] }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="w-96 h-96 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.6) 0%, rgba(79,70,229,0.3) 40%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </motion.div>

        {/* Rings */}
        <div className="absolute left-1/2 top-1/2">
          <Ring delay={0} scale={1.5} color="rgba(124,58,237,0.8)" />
          <Ring delay={0.4} scale={2.2} color="rgba(99,102,241,0.6)" />
          <Ring delay={0.8} scale={3} color="rgba(139,92,246,0.4)" />
          <Ring delay={1.2} scale={4} color="rgba(167,139,250,0.2)" />
        </div>

        {/* Particles */}
        <div className="absolute left-1/2 top-1/2">
          {Array.from({ length: particleCount }).map((_, i) => (
            <Particle key={i} index={i} total={particleCount} />
          ))}
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.08, 1], opacity: 1 }}
            transition={{
              duration: 0.8,
              ease: [0.34, 1.56, 0.64, 1],
              delay: 0.2,
            }}
          >
            <motion.div
              animate={{ filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-xs font-semibold tracking-[0.3em] text-violet-300/80 uppercase mb-3"
            >
              Evolution
            </motion.div>

            <motion.div
              className="text-7xl font-bold tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #a78bfa 0%, #818cf8 30%, #60a5fa 60%, #34d399 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 30px rgba(124,58,237,0.8))",
              }}
            >
              Gen {level}
            </motion.div>

            {genName !== `Gen ${level}` && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-semibold text-white/60 mt-2 tracking-wide"
              >
                {genName}
              </motion.div>
            )}
          </motion.div>

          {mutation && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="mt-6 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{
                background: "rgba(124,58,237,0.25)",
                border: "1px solid rgba(124,58,237,0.5)",
                color: "#c4b5fd",
                boxShadow: "0 0 20px rgba(124,58,237,0.3)",
              }}
            >
              ✦ {mutation}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ delay: 2.5, duration: 1.5 }}
            className="mt-8 text-xs text-white/30 tracking-widest uppercase"
          >
            새로운 형태로 깨어나고 있어
          </motion.div>
        </div>

        {/* Scanline effect */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: [0, 0.6, 0], scaleX: [0, 1, 1] }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.8), transparent)",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DNA_AXES, type CreatureDNA, getDominantTraits } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { getExpressedTraits, getTraitProfile } from "@/lib/genome/traits";
import { deriveDNAAppearance } from "@/lib/genome/appearance";

type DNARevealProps = {
  dna: CreatureDNA;
  soulReading?: string | null;
  onContinue: () => void;
  onShare: () => void;
};

const AXIS_LABELS: Record<string, string> = {
  analytical: "Analytical",
  intuitive: "Intuitive",
  verbal: "Verbal",
  spatial: "Spatial",
  warmth: "Warmth",
  intensity: "Intensity",
  stability: "Stability",
  openness: "Openness",
  assertiveness: "Assertiveness",
  empathy: "Empathy",
  playfulness: "Playfulness",
  independence: "Independence",
  curiosity: "Curiosity",
  persistence: "Persistence",
  adaptability: "Adaptability",
  creativity: "Creativity",
};

const AXIS_COLORS: Record<string, string> = {
  analytical: "#60a5fa",
  intuitive: "#a78bfa",
  verbal: "#34d399",
  spatial: "#22d3ee",
  warmth: "#fb923c",
  intensity: "#f43f5e",
  stability: "#6ee7b7",
  openness: "#c084fc",
  assertiveness: "#fbbf24",
  empathy: "#f472b6",
  playfulness: "#facc15",
  independence: "#475569",
  curiosity: "#2dd4bf",
  persistence: "#818cf8",
  adaptability: "#a3e635",
  creativity: "#e879f9",
};

function RadarChart({ dna, animate }: { dna: CreatureDNA; animate: boolean }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40;
  const axes = DNA_AXES;

  const points = axes.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const val = dna[axis];
    const r = maxR * val;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (maxR + 22) * Math.cos(angle),
      labelY: cy + (maxR + 22) * Math.sin(angle),
      axis,
      val,
    };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Ring lines
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      {/* Rings */}
      {rings.map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={maxR * r}
          fill="none"
          stroke="white"
          strokeOpacity={0.08}
          strokeWidth={0.5}
        />
      ))}
      {/* Axis lines */}
      {axes.map((_, i) => {
        const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(angle)}
            y2={cy + maxR * Math.sin(angle)}
            stroke="white"
            strokeOpacity={0.06}
            strokeWidth={0.5}
          />
        );
      })}
      {/* Data shape */}
      <motion.path
        d={pathD}
        fill="url(#dnaGradient)"
        fillOpacity={0.25}
        stroke="url(#dnaStroke)"
        strokeWidth={1.5}
        initial={animate ? { opacity: 0, scale: 0 } : {}}
        animate={animate ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle
          key={p.axis}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={AXIS_COLORS[p.axis]}
          initial={animate ? { opacity: 0, scale: 0 } : {}}
          animate={animate ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
        />
      ))}
      {/* Labels */}
      {points.map((p) => (
        <text
          key={`label-${p.axis}`}
          x={p.labelX}
          y={p.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={AXIS_COLORS[p.axis]}
          fontSize={7}
          fontWeight={p.val > 0.6 ? 600 : 400}
          opacity={p.val > 0.45 ? 0.9 : 0.4}
        >
          {AXIS_LABELS[p.axis]}
        </text>
      ))}
      <defs>
        <linearGradient id="dnaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="dnaStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DescribeDNA(dna: CreatureDNA): string {
  const dominant = getDominantTraits(dna, 3);
  const descriptions: Record<string, string> = {
    analytical: "a sharp, pattern-seeking mind",
    intuitive: "deep intuition that reads between lines",
    verbal: "natural eloquence and expressiveness",
    spatial: "a structural, systems-thinking perspective",
    warmth: "genuine warmth that draws others in",
    intensity: "fierce emotional energy",
    stability: "grounded calm that anchors everything",
    openness: "radical openness to new experiences",
    assertiveness: "bold confidence that leads",
    empathy: "deep sensitivity to others' feelings",
    playfulness: "spontaneous joy and humor",
    independence: "a fiercely independent spirit",
    curiosity: "relentless curiosity about everything",
    persistence: "unwavering determination",
    adaptability: "fluid adaptability to any situation",
    creativity: "boundless creative imagination",
  };
  const parts = dominant.map((a) => descriptions[a]);
  if (parts.length >= 3) return `A being shaped by ${parts[0]}, ${parts[1]}, and ${parts[2]}.`;
  if (parts.length >= 2) return `A being shaped by ${parts[0]} and ${parts[1]}.`;
  return `A being shaped by ${parts[0]}.`;
}

export function DNAReveal({ dna, soulReading, onContinue, onShare }: DNARevealProps) {
  const [phase, setPhase] = useState<"intro" | "chart" | "traits" | "cta">("intro");
  const species = useMemo(() => deriveSpecies(dna), [dna]);
  const traits = useMemo(() => getTraitProfile(dna).slice(0, 4), [dna]);
  const expressedTraits = useMemo(() => getExpressedTraits(dna), [dna]);
  const description = useMemo(() => DescribeDNA(dna), [dna]);
  let appearance: { primaryHue: number; primarySaturation: number; primaryLightness: number } | null = null;
  try {
    appearance = deriveDNAAppearance(dna, species, 1);
  } catch {
    // appearance derivation may fail if species profile format mismatches
  }

  const primaryColor = appearance
    ? `hsl(${appearance.primaryHue}, ${appearance.primarySaturation}%, ${appearance.primaryLightness}%)`
    : "#a855f7";

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("chart"), 1800),
      setTimeout(() => setPhase("traits"), 3500),
      setTimeout(() => setPhase("cta"), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 overflow-y-auto"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse at center, ${primaryColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full py-8">
        {/* Phase 1: Intro text */}
        <AnimatePresence>
          {phase === "intro" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.p
                className="text-sm tracking-[0.3em] uppercase text-white/50"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Analyzing your pattern...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2+: Species name */}
        <AnimatePresence>
          {phase !== "intro" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center mb-6"
            >
              <p className="text-xs tracking-[0.25em] uppercase text-white/40 mb-2">
                Your Gyeol
              </p>
              <h1
                className="text-3xl font-bold tracking-wide"
                style={{ color: primaryColor }}
              >
                {species.name}
              </h1>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-white/50">
                <span className="capitalize">{species.archetype}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="capitalize">{species.element}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>{species.rarity > 0.7 ? "Rare" : species.rarity > 0.5 ? "Uncommon" : "Common"}</span>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mt-4 text-sm text-white/70 leading-relaxed max-w-xs mx-auto italic"
              >
                {soulReading || description}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2+: Radar chart */}
        <AnimatePresence>
          {(phase === "chart" || phase === "traits" || phase === "cta") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="my-4"
            >
              <RadarChart dna={dna} animate={phase === "chart"} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3+: Traits */}
        <AnimatePresence>
          {(phase === "traits" || phase === "cta") && expressedTraits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap justify-center gap-2 mb-6"
            >
              {expressedTraits.slice(0, 4).map((trait, i) => (
                <motion.span
                  key={trait.id}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    borderColor: trait.visualEffect.glowColor || primaryColor,
                    color: trait.visualEffect.glowColor || primaryColor,
                    backgroundColor: `${trait.visualEffect.glowColor || primaryColor}15`,
                  }}
                >
                  {trait.name.en}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3+: Trait-less fallback — show dominant axes */}
        <AnimatePresence>
          {(phase === "traits" || phase === "cta") && expressedTraits.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap justify-center gap-2 mb-6"
            >
              {getDominantTraits(dna, 4).map((axis, i) => (
                <motion.span
                  key={axis}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    borderColor: AXIS_COLORS[axis],
                    color: AXIS_COLORS[axis],
                    backgroundColor: `${AXIS_COLORS[axis]}15`,
                  }}
                >
                  {AXIS_LABELS[axis]} {Math.round(dna[axis] * 100)}%
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 4: CTA */}
        <AnimatePresence>
          {phase === "cta" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-3 w-full max-w-xs"
            >
              <p className="text-sm text-white/50 text-center mb-2">
                3 messages shaped this. Imagine what 100 could do.
              </p>

              <button
                onClick={onContinue}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-black transition-transform active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                Continue growing →
              </button>

              <button
                onClick={onShare}
                className="w-full py-3 rounded-2xl text-sm font-medium text-white/70 border border-white/10 hover:border-white/20 transition-all active:scale-95"
              >
                Share my Gyeol
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

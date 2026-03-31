"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { type CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { deriveDNAAppearance } from "@/lib/genome/appearance";

type FriendPreviewProps = {
  dna: CreatureDNA;
  reading: string | null;
  onTryOwn: () => void;
};

export function FriendPreview({ dna, reading, onTryOwn }: FriendPreviewProps) {
  const species = useMemo(() => deriveSpecies(dna), [dna]);
  let appearance: { primaryHue: number; primarySaturation: number; primaryLightness: number } | null = null;
  try {
    appearance = deriveDNAAppearance(dna, species, 1);
  } catch {}
  const color = appearance
    ? `hsl(${appearance.primaryHue}, ${appearance.primarySaturation}%, ${appearance.primaryLightness}%)`
    : "#a855f7";

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      <div
        className="absolute inset-0 opacity-15"
        style={{ background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-md"
      >
        <p className="text-xs tracking-[0.25em] uppercase text-white/40 mb-2">
          Someone shared their Gyeol
        </p>

        {/* Creature orb */}
        <motion.div
          className="relative w-28 h-28 mx-auto mb-6"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 rounded-full blur-xl opacity-40" style={{ backgroundColor: color }} />
          <div
            className="relative w-full h-full rounded-full flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 40% 40%, ${color}, ${color}88)` }}
          >
            <div className="w-5 h-5 rounded-full bg-white/80" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold tracking-wide" style={{ color }}>
          {species.name}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-white/50">
          <span className="capitalize">{species.archetype}</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span className="capitalize">{species.element}</span>
        </div>

        {reading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-5 text-sm text-white/60 leading-relaxed italic"
          >
            &ldquo;{reading}&rdquo;
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-8"
        >
          <p className="text-sm text-white/40 mb-4">
            This was shaped by just 3 messages. What would yours look like?
          </p>
          <button
            onClick={onTryOwn}
            className="px-8 py-3 rounded-2xl bg-white text-black text-sm font-semibold transition-transform active:scale-95"
          >
            Discover mine
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

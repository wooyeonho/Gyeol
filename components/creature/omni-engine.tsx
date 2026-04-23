"use client";

import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { damp } from "maath/easing";
import {
  pickBestVessel,
  type VesselContext,
  type PhaseShiftState,
  type VesselPlugin,
} from "@/lib/creature/vessel-system";
import { morphogenesisVesselPlugin } from "@/components/creature/vessels/morphogenesis-vessel";
import { particleVesselPlugin } from "@/components/creature/vessels/particle-vessel";
import type { CreatureDNA } from "@/lib/genome/dna";

// ─── Registry ─────────────────────────────────────────────────────────────────
// Adding a new vessel = push a VesselPlugin to this array. No switch/if ever added.
const VESSEL_REGISTRY: VesselPlugin[] = [
  morphogenesisVesselPlugin,
  particleVesselPlugin,
  // Future: abstractVesselPlugin
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface OmniEngineProps {
  dna: CreatureDNA;
  context: VesselContext;
  scale: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OmniEngine({ dna, context, scale }: OmniEngineProps) {
  const [activeId, setActiveId] = useState<string>(
    () => pickBestVessel(VESSEL_REGISTRY, dna, context).id,
  );
  const [phaseShift, setPhaseShift] = useState<PhaseShiftState | null>(null);

  // Refs avoid stale closures inside useFrame
  const dnaRef         = useRef(dna);
  // eslint-disable-next-line react-hooks/refs
  dnaRef.current       = dna;
  const contextRef     = useRef(context);
  // eslint-disable-next-line react-hooks/refs
  contextRef.current   = context;
  const phaseShiftRef  = useRef(phaseShift);
  // eslint-disable-next-line react-hooks/refs
  phaseShiftRef.current = phaseShift;
  const activeIdRef    = useRef(activeId);
  // eslint-disable-next-line react-hooks/refs
  activeIdRef.current  = activeId;

  useFrame((_, dt) => {
    const best = pickBestVessel(VESSEL_REGISTRY, dnaRef.current, contextRef.current);
    const ps   = phaseShiftRef.current;
    const cur  = activeIdRef.current;

    // Start transition when a new vessel wins
    if (best.id !== cur && !ps) {
      setPhaseShift({ from: cur, to: best.id, progress: 0 });
      return;
    }

    // Advance phase-shift
    if (ps) {
      damp(ps, "progress", 1.0, 1.2, dt);
      if (ps.progress >= 0.99) {
        setActiveId(ps.to);
        setPhaseShift(null);
      } else {
        setPhaseShift({ ...ps });
      }
    }
  });

  const outOpacity = phaseShift ? 1 - phaseShift.progress : 0;
  const inOpacity  = phaseShift ? phaseShift.progress : 1;

  return (
    <>
      {phaseShift?.from != null &&
        renderVessel(VESSEL_REGISTRY, phaseShift.from, dna, context, scale, outOpacity, 0)}
      {renderVessel(
        VESSEL_REGISTRY,
        phaseShift?.to ?? activeId,
        dna, context, scale, inOpacity, 1,
      )}
    </>
  );
}

function renderVessel(
  registry: VesselPlugin[],
  id: string,
  dna: CreatureDNA,
  context: VesselContext,
  scale: number,
  opacity: number,
  renderOrder: number,
) {
  const plugin = registry.find(v => v.id === id);
  if (!plugin) return null;
  const { Component } = plugin;
  return (
    <group key={`${id}-${renderOrder}`} renderOrder={renderOrder}>
      <Component dna={dna} context={context} opacity={opacity} scale={scale} />
    </group>
  );
}

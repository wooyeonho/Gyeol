"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import type { BodyStructure } from "@/lib/genome/body-plan";
import { generateOrganicGeometry } from "@/lib/genome/organic-geometry";
import type { VisualParams } from "@/lib/genome/visual-params";

interface Props {
  structure: BodyStructure;
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
  emissiveIntensity: number;
  activityDim: number;
  vitality: number;
  toonGradient: THREE.DataTexture;
  archetype?: string;
  /** DNA-derived visual parameters for material and geometry overrides */
  visualParams?: VisualParams;
}

/**
 * Renders a living creature from continuous body structure parameters.
 *
 * Instead of assembling primitives (sphere + capsule = robot), this
 * generates a SINGLE organic mesh by deforming a high-res sphere.
 * Head, limbs, tail, wings emerge as smooth bulges of one body —
 * like a real organism growing, not parts being assembled.
 */
export const CreatureBodyPlan = React.memo(function CreatureBodyPlan({
  structure,
  primaryColor,
  secondaryColor,
  emissiveIntensity,
  activityDim,
  vitality,
  toonGradient,
  archetype,
  visualParams,
}: Props) {
  // Archetype-aware opacity: ethereal/spectral are more transparent, mechanical is opaque.
  // If visualParams is provided, its opacity value replaces the archetype heuristic.
  const baseOpacity = visualParams
    ? visualParams.opacity
    : archetype === "ethereal" ? 0.7
    : archetype === "spectral" ? 0.65
    : archetype === "mechanical" ? 0.95
    : 0.9;
  const opacity = Math.max(0.4, activityDim * baseOpacity * Math.max(0.5, vitality));

  // Generate single organic geometry from structure
  const organicGeo = useMemo(() => {
    const geo = generateOrganicGeometry(structure, 0.42);

    // Add vertex colors for visual richness.
    // noiseAmplitude (from DNA playfulness/creativity) adds chromatic variation
    // to the color blend, making high-playfulness creatures visually erratic.
    const positions = geo.attributes.position.array as Float32Array;
    const vertCount = positions.length / 3;
    const colors = new Float32Array(vertCount * 3);

    const pR = primaryColor.r, pG = primaryColor.g, pB = primaryColor.b;
    const sR = secondaryColor.r, sG = secondaryColor.g, sB = secondaryColor.b;
    const noise = visualParams?.noiseAmplitude ?? 0;
    const asymmetry = visualParams?.asymmetryFactor ?? 0;

    for (let vi = 0; vi < vertCount; vi++) {
      const vx = positions[vi * 3];
      const vy = positions[vi * 3 + 1];
      const vz = positions[vi * 3 + 2];

      // Distance from center — extremities get secondary color
      const dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const normalDist = Math.min(1, dist / 0.6);

      // Base blend: body center = primary, extremities = secondary
      let blend = Math.pow(normalDist, 2) * 0.6;

      // Asymmetry shifts color toward secondary on one side (x > 0),
      // driven by DNA playfulness/independence
      if (asymmetry > 0.1) {
        const sideBias = Math.max(0, vx / 0.5) * asymmetry * 0.35;
        blend = Math.min(1, blend + sideBias);
      }

      // Noise adds chromatic variation per vertex — high playfulness = color glitch
      const noiseFactor = noise > 0.02
        ? (Math.sin(vx * 31.7 + vy * 17.3 + vz * 23.1) * 0.5 + 0.5) * noise * 0.5
        : 0;

      const finalBlend = Math.min(1, blend + noiseFactor);
      colors[vi * 3]     = pR * (1 - finalBlend) + sR * finalBlend;
      colors[vi * 3 + 1] = pG * (1 - finalBlend) + sG * finalBlend;
      colors[vi * 3 + 2] = pB * (1 - finalBlend) + sB * finalBlend;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [structure, primaryColor, secondaryColor, visualParams?.noiseAmplitude, visualParams?.asymmetryFactor]);

  // Dispose on unmount
  useMemo(() => {
    return () => { organicGeo.dispose(); };
  }, [organicGeo]);

  // Emissive intensity: visualParams.emissiveBoost blends with the existing
  // archetype-based multiplier. High DNA intensity/openness/creativity = more glow.
  const archetypeEmissiveMod = archetype === "organic" ? 0.4
    : archetype === "mechanical" ? 0.3
    : archetype === "verdant" ? 0.5
    : archetype === "crystalline" ? 0.7
    : archetype === "volcanic" ? 0.8
    : 0.9;
  const finalEmissiveIntensity = visualParams
    ? emissiveIntensity * archetypeEmissiveMod * (0.6 + visualParams.emissiveBoost * 0.8)
    : emissiveIntensity * archetypeEmissiveMod;

  return (
    <mesh geometry={organicGeo}>
      <meshToonMaterial
        color={primaryColor}
        emissive={primaryColor}
        emissiveIntensity={finalEmissiveIntensity}
        transparent
        opacity={opacity}
        gradientMap={toonGradient}
        vertexColors
      />
    </mesh>
  );
});

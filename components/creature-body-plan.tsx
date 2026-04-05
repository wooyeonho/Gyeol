"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import type { BodyStructure } from "@/lib/genome/body-plan";
import { generateOrganicGeometry } from "@/lib/genome/organic-geometry";

interface Props {
  structure: BodyStructure;
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
  emissiveIntensity: number;
  activityDim: number;
  vitality: number;
  toonGradient: THREE.DataTexture;
  archetype?: string;
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
}: Props) {
  // Archetype-aware opacity: ethereal/spectral are more transparent, mechanical is opaque
  const baseOpacity = archetype === "ethereal" ? 0.7
    : archetype === "spectral" ? 0.65
    : archetype === "mechanical" ? 0.95
    : 0.9;
  const opacity = Math.max(0.4, activityDim * baseOpacity * Math.max(0.5, vitality));

  // Generate single organic geometry from structure
  const organicGeo = useMemo(() => {
    const geo = generateOrganicGeometry(structure, 0.42);

    // Add vertex colors for visual richness
    const positions = geo.attributes.position.array as Float32Array;
    const vertCount = positions.length / 3;
    const colors = new Float32Array(vertCount * 3);

    const pR = primaryColor.r, pG = primaryColor.g, pB = primaryColor.b;
    const sR = secondaryColor.r, sG = secondaryColor.g, sB = secondaryColor.b;

    for (let vi = 0; vi < vertCount; vi++) {
      const vx = positions[vi * 3];
      const vy = positions[vi * 3 + 1];
      const vz = positions[vi * 3 + 2];

      // Distance from center — extremities get secondary color
      const dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const normalDist = Math.min(1, dist / 0.6);

      // Blend: body center = primary, extremities = secondary
      const blend = Math.pow(normalDist, 2) * 0.6;

      colors[vi * 3] = pR * (1 - blend) + sR * blend;
      colors[vi * 3 + 1] = pG * (1 - blend) + sG * blend;
      colors[vi * 3 + 2] = pB * (1 - blend) + sB * blend;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [structure, primaryColor, secondaryColor]);

  // Dispose on unmount
  useMemo(() => {
    return () => { organicGeo.dispose(); };
  }, [organicGeo]);

  return (
    <mesh geometry={organicGeo}>
      <meshToonMaterial
        color={primaryColor}
        emissive={primaryColor}
        emissiveIntensity={emissiveIntensity * (
          archetype === "organic" ? 0.4
          : archetype === "mechanical" ? 0.3
          : archetype === "verdant" ? 0.5
          : archetype === "crystalline" ? 0.7
          : archetype === "volcanic" ? 0.8
          : 0.9
        )}
        transparent
        opacity={opacity}
        gradientMap={toonGradient}
        vertexColors
      />
    </mesh>
  );
});

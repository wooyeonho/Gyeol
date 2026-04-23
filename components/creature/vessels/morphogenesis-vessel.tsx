"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp } from "maath/easing";
import { deriveSpecies } from "@/lib/genome/species";
import { deriveDNAAppearance } from "@/lib/genome/appearance";
import {
  morphogenesisVertexShader,
  morphogenesisFragmentShader,
  createMorphogenesisUniforms,
  type MorphogenesisUniforms,
} from "@/lib/shaders/morphogenesis-shader";
import type { VesselPlugin, VesselProps } from "@/lib/creature/vessel-system";
import type { CreatureDNA } from "@/lib/genome/dna";
import type { VesselContext } from "@/lib/creature/vessel-system";

const DAMP_LAMBDA = 1.8;

// IcosahedronGeometry(0.5, 4) → ~10k triangles — balanced quality / mobile perf
const BASE_GEOMETRY = new THREE.IcosahedronGeometry(0.5, 4);

function MorphogenesisVesselInner({ dna, context: _context, opacity, scale }: VesselProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const species  = useMemo(() => deriveSpecies(dna), [dna]);
  const appearance = useMemo(() => deriveDNAAppearance(dna, species), [dna, species]);

  const baseColor = useMemo(
    () =>
      new THREE.Color().setHSL(
        appearance.primaryHue / 360,
        appearance.primarySaturation / 100,
        appearance.primaryLightness / 100,
      ),
    [appearance.primaryHue, appearance.primarySaturation, appearance.primaryLightness],
  );

  // Uniforms initialised once from DNA — damp() evolves them every frame
  const uniforms = useMemo(
    () => createMorphogenesisUniforms(dna, baseColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }, dt) => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms as unknown as MorphogenesisUniforms;

    u.uTime.value = clock.getElapsedTime();

    // Damp all 16 DNA axes toward current values — continuous morph, no snapshots
    damp(u.uAnalytical, "value", dna.analytical,    DAMP_LAMBDA, dt);
    damp(u.uIntuitive, "value", dna.intuitive,     DAMP_LAMBDA, dt);
    damp(u.uVerbal, "value", dna.verbal,        DAMP_LAMBDA, dt);
    damp(u.uSpatial, "value", dna.spatial,       DAMP_LAMBDA, dt);
    damp(u.uWarmth, "value", dna.warmth,        DAMP_LAMBDA, dt);
    damp(u.uIntensity, "value", dna.intensity,     DAMP_LAMBDA, dt);
    damp(u.uStability, "value", dna.stability,     DAMP_LAMBDA, dt);
    damp(u.uOpenness, "value", dna.openness,      DAMP_LAMBDA, dt);
    damp(u.uAssertiveness, "value", dna.assertiveness, DAMP_LAMBDA, dt);
    damp(u.uEmpathy, "value", dna.empathy,       DAMP_LAMBDA, dt);
    damp(u.uPlayfulness, "value", dna.playfulness,   DAMP_LAMBDA, dt);
    damp(u.uIndependence, "value", dna.independence,  DAMP_LAMBDA, dt);
    damp(u.uCuriosity, "value", dna.curiosity,     DAMP_LAMBDA, dt);
    damp(u.uPersistence, "value", dna.persistence,   DAMP_LAMBDA, dt);
    damp(u.uAdaptability, "value", dna.adaptability,  DAMP_LAMBDA, dt);
    damp(u.uCreativity, "value", dna.creativity,    DAMP_LAMBDA, dt);

    // New 16 DNA axes (Physical Form, Surface, Expression, Behavior)
    damp(u.uBodyShape, "value", dna.bodyShape,     DAMP_LAMBDA, dt);
    damp(u.uLimbLength, "value", dna.limbLength,    DAMP_LAMBDA, dt);
    damp(u.uHeadRatio, "value", dna.headRatio,     DAMP_LAMBDA, dt);
    damp(u.uBodyDensity, "value", dna.bodyDensity,   DAMP_LAMBDA, dt);
    damp(u.uFurDensity, "value", dna.furDensity,    DAMP_LAMBDA, dt);
    damp(u.uPatternComplexity, "value", dna.patternComplexity, DAMP_LAMBDA, dt);
    damp(u.uTransparency, "value", dna.transparency,  DAMP_LAMBDA, dt);
    damp(u.uShininess, "value", dna.shininess,     DAMP_LAMBDA, dt);
    damp(u.uEyeSize, "value", dna.eyeSize,       DAMP_LAMBDA, dt);
    damp(u.uMouthExpressiveness, "value", dna.mouthExpressiveness, DAMP_LAMBDA, dt);
    damp(u.uBlushIntensity, "value", dna.blushIntensity, DAMP_LAMBDA, dt);
    damp(u.uGlowReactivity, "value", dna.glowReactivity, DAMP_LAMBDA, dt);
    damp(u.uLocomotionStyle, "value", dna.locomotionStyle, DAMP_LAMBDA, dt);
    damp(u.uVoiceTimbre, "value", dna.voiceTimbre,   DAMP_LAMBDA, dt);
    damp(u.uSocialDistance, "value", dna.socialDistance, DAMP_LAMBDA, dt);
    damp(u.uElementalAffinity, "value", dna.elementalAffinity, DAMP_LAMBDA, dt);

    // Color damping
    damp(u.uBaseColor.value, "r", baseColor.r, DAMP_LAMBDA, dt);
    damp(u.uBaseColor.value, "g", baseColor.g, DAMP_LAMBDA, dt);
    damp(u.uBaseColor.value, "b", baseColor.b, DAMP_LAMBDA, dt);

    // Opacity is driven directly by OmniEngine (snappy cross-fade, no damp)
    u.uOpacity.value = opacity;
  });

  return (
    <mesh
      geometry={BASE_GEOMETRY}
      scale={scale}
      renderOrder={1}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={morphogenesisVertexShader}
        fragmentShader={morphogenesisFragmentShader}
        uniforms={uniforms as unknown as Record<string, THREE.IUniform>}
        transparent
        depthWrite={false}
        customProgramCacheKey={() => "morphogenesis-v2-32axis"}
      />
    </mesh>
  );
}

function computeMorphogenesisAffinity(dna: CreatureDNA, ctx: VesselContext): number {
  return (
    0.2
    + dna.warmth      * 0.25
    + dna.empathy     * 0.2
    + dna.playfulness * 0.15
    + dna.creativity  * 0.15
    + ctx.conversationEnergy * 0.05
  );
}

export const morphogenesisVesselPlugin: VesselPlugin = {
  id: "morphogenesis",
  computeAffinity: computeMorphogenesisAffinity,
  Component: MorphogenesisVesselInner,
};

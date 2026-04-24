"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp } from "@/lib/easing";
import { deriveDNAAppearance } from "@/lib/genome/appearance";
import { deriveSpecies } from "@/lib/genome/species";
import type { VesselPlugin, VesselProps, VesselContext } from "@/lib/creature/vessel-system";
import type { CreatureDNA } from "@/lib/genome/dna";

// ─── Constants ────────────────────────────────────────────────────────────────

// 40k: dense enough for visual impact, within mobile GPU thermal budget.
// At 60fps, each frame invokes the vertex shader 40k × 6 times (6 verts per quad).
const PARTICLE_COUNT = 40_000;

// ─── Module-scoped geometry (created once, never GC'd) ───────────────────────
// PlaneGeometry(1,1): each instance renders a 1×1 billboard quad.
// aSeed (InstancedBufferAttribute): one deterministic [0..1] seed per instance.
// The vertex shader reads aSeed to compute unique orbital parameters per particle.
// Zero CPU involvement after this init — all position math runs on the GPU.
const BILLBOARD_GEO = (() => {
  const geo = new THREE.PlaneGeometry(1, 1);
  const seeds = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) seeds[i] = i / PARTICLE_COUNT;
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  return geo;
})();

// ─── TypeScript Uniform Interface ─────────────────────────────────────────────

interface ParticleUniforms {
  [key: string]: { value: unknown };
  uTime:          { value: number };
  uOpacity:       { value: number };
  uParticleSize:  { value: number };
  // Cognitive group
  uAnalytical:    { value: number };
  uIntuitive:     { value: number };
  uVerbal:        { value: number };
  uSpatial:       { value: number };
  // Emotional group
  uWarmth:        { value: number };
  uIntensity:     { value: number };
  uStability:     { value: number };
  uOpenness:      { value: number };
  // Social group
  uAssertiveness: { value: number };
  uEmpathy:       { value: number };
  uPlayfulness:   { value: number };
  uIndependence:  { value: number };
  // Meta group
  uCuriosity:     { value: number };
  uPersistence:   { value: number };
  uAdaptability:  { value: number };
  uCreativity:    { value: number };
  // Physical Form
  uBodyShape:     { value: number };
  uBodyDensity:   { value: number };
  // Surface
  uTransparency:  { value: number };
  uShininess:     { value: number };
  // Expression
  uGlowReactivity: { value: number };
  // Behavior
  uElementalAffinity: { value: number };
  uSocialDistance: { value: number };
  // Visual
  uBaseColor:     { value: THREE.Color };
  uRimColor:      { value: THREE.Color };
}

// ─── GLSL: 3D Simplex Noise — Ashima Arts / Ian McEwan (MIT License) ─────────

const SIMPLEX_NOISE_GLSL = /* glsl */ `
vec4 _perm(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 _tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=_perm(_perm(_perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=_tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// ─── Vertex Shader ────────────────────────────────────────────────────────────
// Self-verification:
//   ✅ Zero if/switch — all branching replaced with step/mix/smoothstep/clamp
//   ✅ Zero CPU per-frame — uTime + 16 DNA uniforms only; aSeed is static
//   ✅ Billboard: quad vertices offset by camera right/up axes every frame

const particleVertexShader = /* glsl */ `
${SIMPLEX_NOISE_GLSL}

attribute float aSeed;

uniform float uTime;
uniform float uOpacity;
uniform float uParticleSize;
uniform float uAnalytical;
uniform float uIntuitive;
uniform float uVerbal;
uniform float uSpatial;
uniform float uWarmth;
uniform float uIntensity;
uniform float uStability;
uniform float uOpenness;
uniform float uAssertiveness;
uniform float uEmpathy;
uniform float uPlayfulness;
uniform float uIndependence;
uniform float uCuriosity;
uniform float uPersistence;
uniform float uAdaptability;
uniform float uCreativity;
// New DNA axes for particle behavior
uniform float uBodyShape;
uniform float uBodyDensity;
uniform float uTransparency;
uniform float uShininess;
uniform float uGlowReactivity;
uniform float uElementalAffinity;
uniform float uSocialDistance;

varying vec2  vUv;
varying float vFade;
varying float vSeed;
varying float vEmissive;
varying float vShininess;

// ─── Deterministic hash functions (pure math, no RNG) ────────────────────────
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
float h2(float n) { return fract(cos(n * 311.7 + 53.1) * 9301.00691); }
float h3(float n) { return fract(sin(n * 53.1  + 131.7) * 75362.000); }

void main() {
  float s = aSeed;  // [0..1] unique per instance — only source of particle identity

  // ─── Per-particle orbital base parameters ────────────────────────────────
  float baseAngle  = s * 6.28318;
  float baseElev   = h1(s) * 2.0 - 1.0;   // elevation: -1..1
  float orbitLayer = h2(s);                 // radial layer: 0..1
  float brightness = 0.4 + h3(s) * 0.6;   // per-particle base brightness

  // ─── DNA → orbital physics (zero branches, pure math) ────────────────────

  // SPATIAL: orbit radius — wide orbits for spatially-minded creatures
  float orbitRadius = 0.25 + orbitLayer * uSpatial * 0.45;

  // STABILITY: eccentricity — circular (high) vs elliptical (low)
  float zScale = 0.3 + uStability * 0.7;

  // ANALYTICAL: orbit frequency — ordered (high) vs chaotic scattering (low)
  float chaosFreq   = 0.3 + h1(s + 0.1) * 1.8;
  float orderedFreq = 0.8 + orbitLayer   * 0.4;
  float orbitFreq   = mix(chaosFreq, orderedFreq, uAnalytical);

  // PLAYFULNESS: helical spiral — elevation drives azimuth offset
  float spiral = baseElev * uPlayfulness * 1.8;

  // VERBAL: cloud elongation along Y axis
  float yStretch = 1.0 + uVerbal * 1.4;

  // PERSISTENCE: particle lifetime — longer-lived particles = denser cloud
  float lifetime = 1.5 + uPersistence * 6.0;

  // ─── Time-driven orbit angle ──────────────────────────────────────────────
  float angle = baseAngle + uTime * orbitFreq + spiral;

  // ─── Base orbital position (elliptical) ──────────────────────────────────
  float cosE    = sqrt(max(0.0, 1.0 - baseElev * baseElev));
  vec3 orbitPos = vec3(
    cos(angle) * orbitRadius * cosE,
    baseElev   * orbitRadius * yStretch,
    sin(angle) * orbitRadius * cosE * zScale
  );

  // OPENNESS: radial expansion of cloud envelope
  orbitPos *= 1.0 + uOpenness * 0.55;

  // WARMTH: attractor — homogeneous pull toward origin
  orbitPos *= 1.0 - uWarmth * 0.45;

  // ASSERTIVENESS: brief radial ejection burst (unique timing per particle)
  float ejectPhase = fract(h2(s + 0.5) + uTime * 0.04);
  float ejectPulse = smoothstep(0.0, 0.05, ejectPhase) * smoothstep(0.2, 0.05, ejectPhase);
  orbitPos += normalize(orbitPos + vec3(0.0001)) * uAssertiveness * ejectPulse * 0.28;

  // INDEPENDENCE: curl-like turbulence via 3 offset simplex evaluations
  float turbAmp = uIndependence * 0.22;
  orbitPos += vec3(
    snoise(vec3(s * 9.1,       uTime * 0.25, 0.0)),
    snoise(vec3(s * 9.1 + 3.7, uTime * 0.25, 0.0)),
    snoise(vec3(s * 9.1 + 7.3, uTime * 0.25, 0.0))
  ) * turbAmp;

  // CURIOSITY: sinusoidal breathing of the cloud radius
  float breath = sin(uTime * 0.3 + s * 6.28318) * uCuriosity * 0.12;
  orbitPos *= 1.0 + breath;

  // BODY_SHAPE: elongate particle cloud along Y axis
  orbitPos.y *= 1.0 + uBodyShape * 0.6;

  // BODY_DENSITY: compress cloud toward center (dense) or expand (airy)
  orbitPos *= 0.7 + (1.0 - uBodyDensity) * 0.6;

  // SOCIAL_DISTANCE: expand cloud envelope (aloof) or compress (clingy)
  orbitPos *= 0.8 + uSocialDistance * 0.5;

  // ELEMENTAL_AFFINITY: swirl particles around Y axis
  float swirl = uElementalAffinity * 0.8;
  float swirlAngle = orbitPos.y * swirl * 3.14159 + uTime * 0.2;
  float cs = cos(swirlAngle);
  float ss = sin(swirlAngle);
  orbitPos.xz = vec2(orbitPos.x * cs - orbitPos.z * ss,
                     orbitPos.x * ss + orbitPos.z * cs);

  // INTUITIVE: concentric shells — quantize radius toward discrete shells
  float shellCount = 2.0 + uIntuitive * 5.0;
  float rawR       = length(orbitPos);
  float shellR     = floor(rawR * shellCount + 0.5) / shellCount;
  orbitPos = normalize(orbitPos + vec3(0.0001)) * mix(rawR, shellR, uIntuitive * 0.45);

  // EMPATHY: particle size uniformity (high = similar sizes; low = varied)
  float sizeVariety = mix(h3(s + 0.7), 0.7, uEmpathy);

  // ─── Lifecycle: sin fade ensures each particle is born and dies smoothly ──
  float particleAge = fract(h2(s + 0.3) + uTime / lifetime);
  vFade = sin(particleAge * 3.14159);  // 0 at birth/death → 1 at midlife

  // ─── Emissive brightness (INTENSITY drives glow amplitude) ───────────────
  vEmissive = uIntensity * brightness * sizeVariety * (0.5 + 0.5 * vFade);

  // ─── Billboard size (clamped to avoid invisible particles at fade extremes) ─
  float pSize = uParticleSize * sizeVariety * (0.4 + vEmissive * 0.6) * max(vFade, 0.05);

  // ─── Billboard orientation: always face camera ───────────────────────────
  // Camera right/up extracted from view matrix rows (world-space camera axes)
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // position.xy from PlaneGeometry: each vertex is in [-0.5, 0.5]
  vec3 worldPos = orbitPos
                + camRight * position.x * pSize
                + camUp    * position.y * pSize;

  vUv   = uv;   // PlaneGeometry UVs: 0..1 on both axes
  vSeed = s;
  vShininess = uShininess;

  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(worldPos, 1.0);
}
`;

// ─── Fragment Shader ──────────────────────────────────────────────────────────
// Self-verification:
//   ✅ Zero if/switch — circular mask via smoothstep; discard removed entirely
//   ✅ Additive blending handles invisible fragments (alpha=0 contributes nothing)

const particleFragmentShader = /* glsl */ `
uniform vec3  uBaseColor;
uniform vec3  uRimColor;
uniform float uOpacity;
uniform float uCreativity;
uniform float uIntensity;
uniform float uTime;
uniform float uTransparency;
uniform float uGlowReactivity;

varying vec2  vUv;
varying float vFade;
varying float vSeed;
varying float vEmissive;
varying float vShininess;

void main() {
  // Circular soft glow — PlaneGeometry UVs are 0..1 so center is (0.5, 0.5)
  float dist = length(vUv - 0.5);
  float soft = smoothstep(0.5, 0.05, dist);  // 1 at center, 0 at edge

  // CREATIVITY: iridescent hue rotation over time — pure trigonometric, no branch
  float hue   = uCreativity * 0.55 * sin(uTime * 0.38 + vSeed * 6.28318);
  vec3  color = uBaseColor;
  color.r += hue * 0.28;
  color.g -= hue * 0.09;
  color.b += hue * 0.24;

  // Emissive rim bleed — high intensity particles shift toward rim color
  color = mix(color, uRimColor, vEmissive * 0.5);

  // SHININESS: metallic specular highlight on particles
  float specHighlight = pow(soft, 2.0 + vShininess * 8.0) * vShininess * 0.6;
  color += specHighlight * vec3(1.0, 0.95, 0.9);

  // GLOW_REACTIVITY: pulsing brightness
  float reactPulse = sin(uTime * 2.0 + vSeed * 6.28318) * 0.5 + 0.5;
  color *= 1.0 + uGlowReactivity * reactPulse * 0.4;

  // Additive brightness boost — emissive particles punch through dark backgrounds
  color *= 1.0 + vEmissive * 0.8;

  // TRANSPARENCY: modulate particle alpha
  float alphaBase = 1.0 - uTransparency * 0.4;
  gl_FragColor = vec4(color, soft * vFade * uOpacity * alphaBase);
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

function ParticleVesselInner({ dna, context: _context, opacity, scale }: VesselProps) {
  const meshRef     = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const species    = useMemo(() => deriveSpecies(dna), [dna]);
  const appearance = useMemo(() => deriveDNAAppearance(dna, species), [dna, species]);

  // Particles are additive-blended — boost lightness slightly above the DNA hue
  const baseColor = useMemo(
    () =>
      new THREE.Color().setHSL(
        appearance.primaryHue / 360,
        appearance.primarySaturation / 100,
        Math.min(appearance.primaryLightness / 100 + 0.15, 1.0),
      ),
    [appearance.primaryHue, appearance.primarySaturation, appearance.primaryLightness],
  );

  // Uniforms initialised once — damp() evolves them every frame toward DNA targets
  const uniforms: ParticleUniforms = useMemo(
    () => ({
      uTime:          { value: 0 },
      uOpacity:       { value: opacity },
      uParticleSize:  { value: 0.035 },
      uAnalytical:    { value: dna.analytical },
      uIntuitive:     { value: dna.intuitive },
      uVerbal:        { value: dna.verbal },
      uSpatial:       { value: dna.spatial },
      uWarmth:        { value: dna.warmth },
      uIntensity:     { value: dna.intensity },
      uStability:     { value: dna.stability },
      uOpenness:      { value: dna.openness },
      uAssertiveness: { value: dna.assertiveness },
      uEmpathy:       { value: dna.empathy },
      uPlayfulness:   { value: dna.playfulness },
      uIndependence:  { value: dna.independence },
      uCuriosity:     { value: dna.curiosity },
      uPersistence:   { value: dna.persistence },
      uAdaptability:  { value: dna.adaptability },
      uCreativity:    { value: dna.creativity },
      // New DNA axes for particle behavior
      uBodyShape:     { value: dna.bodyShape },
      uBodyDensity:   { value: dna.bodyDensity },
      uTransparency:  { value: dna.transparency },
      uShininess:     { value: dna.shininess },
      uGlowReactivity: { value: dna.glowReactivity },
      uElementalAffinity: { value: dna.elementalAffinity },
      uSocialDistance: { value: dna.socialDistance },
      uBaseColor:     { value: baseColor.clone() },
      uRimColor:      { value: baseColor.clone().offsetHSL(0.1, 0.1, 0.2) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // One-time instance matrix initialisation: fill with identity matrices.
  // StaticDrawUsage signals the GPU this buffer will not change — reduces driver overhead.
  // Our vertex shader ignores instanceMatrix entirely; this init satisfies Three.js internals.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const arr      = mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) arr.set(identity, i * 16);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }, dt) => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms as unknown as ParticleUniforms;

    u.uTime.value    = clock.getElapsedTime();
    u.uOpacity.value = opacity; // direct from OmniEngine — no damp needed

    // ADAPTABILITY controls how fast all DNA uniforms track their targets.
    // High adaptability → fast morph (λ=3.2); low → slow, glacial transition (λ=0.8).
    const λ = 0.8 + dna.adaptability * 2.4;

    u.uAnalytical.value    = damp(u.uAnalytical.value,    dna.analytical,    λ, dt);
    u.uIntuitive.value     = damp(u.uIntuitive.value,     dna.intuitive,     λ, dt);
    u.uVerbal.value        = damp(u.uVerbal.value,        dna.verbal,        λ, dt);
    u.uSpatial.value       = damp(u.uSpatial.value,       dna.spatial,       λ, dt);
    u.uWarmth.value        = damp(u.uWarmth.value,        dna.warmth,        λ, dt);
    u.uIntensity.value     = damp(u.uIntensity.value,     dna.intensity,     λ, dt);
    u.uStability.value     = damp(u.uStability.value,     dna.stability,     λ, dt);
    u.uOpenness.value      = damp(u.uOpenness.value,      dna.openness,      λ, dt);
    u.uAssertiveness.value = damp(u.uAssertiveness.value, dna.assertiveness, λ, dt);
    u.uEmpathy.value       = damp(u.uEmpathy.value,       dna.empathy,       λ, dt);
    u.uPlayfulness.value   = damp(u.uPlayfulness.value,   dna.playfulness,   λ, dt);
    u.uIndependence.value  = damp(u.uIndependence.value,  dna.independence,  λ, dt);
    u.uCuriosity.value     = damp(u.uCuriosity.value,     dna.curiosity,     λ, dt);
    u.uPersistence.value   = damp(u.uPersistence.value,   dna.persistence,   λ, dt);
    u.uAdaptability.value  = damp(u.uAdaptability.value,  dna.adaptability,  λ, dt);
    u.uCreativity.value    = damp(u.uCreativity.value,    dna.creativity,    λ, dt);

    // New 16 DNA axes
    u.uBodyShape.value     = damp(u.uBodyShape.value,     dna.bodyShape,     λ, dt);
    u.uBodyDensity.value   = damp(u.uBodyDensity.value,   dna.bodyDensity,   λ, dt);
    u.uTransparency.value  = damp(u.uTransparency.value,  dna.transparency,  λ, dt);
    u.uShininess.value     = damp(u.uShininess.value,     dna.shininess,     λ, dt);
    u.uGlowReactivity.value = damp(u.uGlowReactivity.value, dna.glowReactivity, λ, dt);
    u.uElementalAffinity.value = damp(u.uElementalAffinity.value, dna.elementalAffinity, λ, dt);
    u.uSocialDistance.value = damp(u.uSocialDistance.value, dna.socialDistance, λ, dt);

    // Color damping — follow DNA hue changes smoothly
    u.uBaseColor.value.r = damp(u.uBaseColor.value.r, baseColor.r, λ, dt);
    u.uBaseColor.value.g = damp(u.uBaseColor.value.g, baseColor.g, λ, dt);
    u.uBaseColor.value.b = damp(u.uBaseColor.value.b, baseColor.b, λ, dt);
  });

  return (
    // scale applied at group level — modelMatrix carries the scale into the vertex shader
    <group scale={scale}>
      <instancedMesh
        ref={meshRef}
        args={[BILLBOARD_GEO, undefined, PARTICLE_COUNT]}
        renderOrder={1}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={materialRef}
          vertexShader={particleVertexShader}
          fragmentShader={particleFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          customProgramCacheKey={() => "particle-vessel-v2-32axis"}
        />
      </instancedMesh>
    </group>
  );
}

// ─── Affinity function ────────────────────────────────────────────────────────
// High openness + adaptability + curiosity → particle cloud emerges.
// Stability counteracts (stable creatures prefer solid morphogenesis form).

function computeParticleAffinity(dna: CreatureDNA, ctx: VesselContext): number {
  return (
    dna.openness     * 0.35
    + dna.adaptability * 0.30
    + dna.curiosity    * 0.20
    - dna.stability    * 0.10
    + ctx.conversationEnergy * 0.08
  );
}

// ─── Plugin export ────────────────────────────────────────────────────────────

export const particleVesselPlugin: VesselPlugin = {
  id: "particle",
  computeAffinity: computeParticleAffinity,
  Component: ParticleVesselInner,
};

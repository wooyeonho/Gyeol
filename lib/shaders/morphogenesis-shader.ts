import * as THREE from "three";
import type { CreatureDNA } from "@/lib/genome/dna";

// ─── TypeScript Uniform Interface ─────────────────────────────────────────────

export interface MorphogenesisUniforms {
  [key: string]: { value: number | THREE.Color };
  uTime:          { value: number };
  // Cognitive group → topology
  uAnalytical:    { value: number };
  uIntuitive:     { value: number };
  uVerbal:        { value: number };
  uSpatial:       { value: number };
  // Emotional group → surface character
  uWarmth:        { value: number };
  uIntensity:     { value: number };
  uStability:     { value: number };
  uOpenness:      { value: number };
  // Social group → deformation style
  uAssertiveness: { value: number };
  uEmpathy:       { value: number };
  uPlayfulness:   { value: number };
  uIndependence:  { value: number };
  // Meta group → complexity & chaos
  uCuriosity:     { value: number };
  uPersistence:   { value: number };
  uAdaptability:  { value: number };
  uCreativity:    { value: number };
  // Fragment
  uBaseColor:     { value: THREE.Color };
  uRimColor:      { value: THREE.Color };
  uInnerColor:    { value: THREE.Color };
  uPulseSpeed:    { value: number };
  uRimIntensity:  { value: number };
  uInnerGlow:     { value: number };
  uOpacity:       { value: number };
  uIridescence:   { value: number };
  uSubsurface:    { value: number };
  uBrightness:    { value: number };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createMorphogenesisUniforms(
  dna: CreatureDNA,
  color: THREE.Color,
): MorphogenesisUniforms {
  const rimColor = color.clone().offsetHSL(0.05, 0.1, 0.2);
  const innerColor = new THREE.Color().lerpColors(
    color,
    new THREE.Color(1, 0.9, 0.7),
    0.4 + dna.warmth * 0.3,
  );
  return {
    uTime:          { value: 0 },
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
    uBaseColor:     { value: color.clone() },
    uRimColor:      { value: rimColor },
    uInnerColor:    { value: innerColor },
    uPulseSpeed:    { value: 1.5 + dna.intensity * 1.5 },
    uRimIntensity:  { value: 0.3 + dna.openness * 0.5 },
    uInnerGlow:     { value: 0.2 + dna.warmth * 0.4 },
    uOpacity:       { value: 1.0 },
    uIridescence:   { value: dna.creativity * 0.6 + dna.intuitive * 0.3 },
    uSubsurface:    { value: 0.3 + dna.warmth * 0.4 },
    uBrightness:    { value: 1.4 },
  };
}

// ─── GLSL Shaders ─────────────────────────────────────────────────────────────

// Simplex 3D Noise — Ashima Arts / Ian McEwan (MIT License)
// https://github.com/ashima/webgl-noise
const SIMPLEX_NOISE_GLSL = /* glsl */ `
vec4 _snoise_permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 _snoise_taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = _snoise_permute(_snoise_permute(_snoise_permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = _snoise_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const morphogenesisVertexShader = /* glsl */ `
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
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

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vFresnel;
varying float vDisplacement;
varying vec2 vUv;

void main() {
  vec3 pos    = position;
  vec3 n      = normalize(pos);
  float r     = length(pos);
  float theta = atan(n.z, n.x);
  float phi   = acos(clamp(n.y, -1.0, 1.0));

  // ① STABILITY: bilateral X-mirror before all noise sampling
  vec3 sampleN = vec3(mix(n.x, abs(n.x), uStability * 0.85), n.yz);

  // ② CREATIVITY: blend periodic sine ↔ chaotic simplex
  float creativeWave = mix(
    sin(sampleN.x * 6.0 + uTime * 0.9) * 0.15,
    snoise(sampleN * 3.0 + uTime * 0.12),
    uCreativity
  );

  // ③ INTUITIVE + SPATIAL: multi-octave organic waves
  float f0 = 2.5 + uSpatial * 4.0;
  float organicWave = (
    snoise(sampleN * f0         + uTime * 0.15)
    + snoise(sampleN * f0 * 2.3 + uTime * 0.08) * 0.5
    + snoise(sampleN * f0 * 5.1 + uTime * 0.04) * 0.25
    + creativeWave
  ) * uIntuitive * 0.3;

  // ④ ASSERTIVENESS × INTENSITY × CURIOSITY × EMPATHY: radial spikes
  float spikeFreq = 2.0 + uCuriosity * 10.0;
  float rawMask   = cos(theta * spikeFreq) * sin(phi * spikeFreq * 0.7);
  float spikeMask = smoothstep(0.0, uEmpathy * 0.4 + 0.05, pow(max(0.0, rawMask), 3.0));
  float spikeHeight = spikeMask * uAssertiveness * uIntensity * 0.7;

  // ⑤ PERSISTENCE: fractal octave bumps — 4 octaves, step-gated (unrolled)
  float fBump = snoise(sampleN * 4.0  + uTime * 0.07) * 0.12;
  fBump += snoise(sampleN * 8.0  + uTime * 0.05) * 0.06  * step(0.25, uPersistence);
  fBump += snoise(sampleN * 16.0 + uTime * 0.03) * 0.03  * step(0.50, uPersistence);
  fBump += snoise(sampleN * 32.0 + uTime * 0.02) * 0.015 * step(0.75, uPersistence);
  float fractalDetail = fBump * uPersistence;

  // ⑥ OPENNESS: concavity / dissolution (negative displacement)
  float dissolveMask = smoothstep(0.3, 0.7, snoise(sampleN * 3.5 + vec3(7.1, 3.3, 5.9)));
  float dissolve = dissolveMask * uOpenness * -0.28;

  // ⑦ ANALYTICAL × ADAPTABILITY: posterize vs smooth displacement
  float raw   = organicWave + fractalDetail + dissolve;
  float steps = 4.0 + uAnalytical * 8.0;
  float faceted = floor(raw * steps + 0.5) / steps;
  float displacement = mix(raw, faceted, uAnalytical * (1.0 - uAdaptability)) + spikeHeight;

  // ⑧ INDEPENDENCE: asymmetric one-sided noise (x > 0 hemisphere only)
  float asymNoise = snoise(n * 3.7 + vec3(2.1, 4.5, 1.3)) * uIndependence * 0.2
                    * smoothstep(-0.3, 0.3, n.x);

  // ⑨ Displace radially from sphere surface
  vec3 deformed = normalize(sampleN) * (r + displacement + asymNoise);

  // ⑩ VERBAL: Y-axis elongation
  deformed.y *= 1.0 + uVerbal;

  // ⑪ PLAYFULNESS: Y-axis torsion
  float tw   = deformed.y * uPlayfulness * 1.5 * 3.14159;
  float cosT = cos(tw);
  float sinT = sin(tw);
  deformed.xz = vec2(deformed.x * cosT - deformed.z * sinT,
                     deformed.x * sinT + deformed.z * cosT);

  // ⑫ WARMTH: pull toward base sphere (anti-spike softening)
  float dR = length(deformed);
  deformed = normalize(deformed) * mix(dR, r, uWarmth * 0.4);

  // ⑬ Varyings — approximate normal = normalized deformed position
  vNormal       = normalize(normalMatrix * normalize(deformed));
  vDisplacement = displacement + asymNoise;
  vUv           = uv;
  vec4 worldPos = modelMatrix * vec4(deformed, 1.0);
  vWorldPosition = worldPos.xyz;
  vec3 viewDir  = normalize(cameraPosition - worldPos.xyz);
  vFresnel      = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const morphogenesisFragmentShader = /* glsl */ `
uniform vec3  uBaseColor;
uniform vec3  uRimColor;
uniform vec3  uInnerColor;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uRimIntensity;
uniform float uInnerGlow;
uniform float uOpacity;
uniform float uIridescence;
uniform float uSubsurface;
uniform float uBrightness;
uniform float uIntensity;

varying vec3  vNormal;
varying vec3  vWorldPosition;
varying float vFresnel;
varying float vDisplacement;
varying vec2  vUv;

float _frag_hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  // Iridescent color shift from viewing angle
  float iriShift = vFresnel * uIridescence * 0.3;
  vec3 color = uBaseColor;
  color.r += iriShift * 0.2;
  color.g -= iriShift * 0.1;
  color.b += iriShift * 0.3;

  // Inner heartbeat glow
  float pulse    = sin(uTime * uPulseSpeed) * 0.5 + 0.5;
  float coreDist = length(vWorldPosition);
  float innerFade = exp(-coreDist * 3.0) * uInnerGlow;
  color = mix(color, uInnerColor, innerFade * (0.6 + pulse * 0.4));

  // Subsurface scattering approximation
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
  vec3 viewDir  = normalize(cameraPosition - vWorldPosition);
  float sss = pow(max(0.0, dot(viewDir, -lightDir + vNormal * 0.5)), 3.0) * uSubsurface;
  color += uBaseColor * sss * 0.4;

  // Fresnel rim glow
  color += uRimColor * vFresnel * uRimIntensity;

  // Spike tips extra emissive — displacement drives brightness
  float spikeTip = smoothstep(0.1, 0.5, vDisplacement);
  color = mix(color, uRimColor * 1.4, spikeTip * uIntensity * 0.4);

  // Subtle organic shimmer
  float shimmer = _frag_hash(vWorldPosition * 20.0 + uTime * 0.5);
  color += shimmer * 0.03 * uRimColor;

  // Self-illumination
  color *= uBrightness;

  // Alpha: opaque core, slight edge transparency — uOpacity driven by OmniEngine phase-shift
  float alpha = uOpacity * (0.92 + vFresnel * 0.08);
  gl_FragColor = vec4(color, alpha);
}
`;

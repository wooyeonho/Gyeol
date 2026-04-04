/**
 * Living Creature Shader Material
 *
 * Custom shader that makes creatures feel alive:
 * - Fresnel rim glow: edges glow like bioluminescence
 * - Inner light pulse: heartbeat-like core glow
 * - Subsurface scattering approximation: light passes through thin parts
 * - Iridescent color shift: viewing angle changes hue slightly
 * - Organic noise: subtle surface shimmer
 */

import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  varying float vFresnel;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vUv = uv;

    // Fresnel: 0 at face-on, 1 at edges
    vFresnel = 1.0 - abs(dot(vNormal, vViewDir));
    vFresnel = pow(vFresnel, 2.0);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uRimColor;
  uniform vec3 uInnerColor;
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uRimIntensity;
  uniform float uInnerGlow;
  uniform float uOpacity;
  uniform float uIridescence;
  uniform float uSubsurface;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  varying float vFresnel;
  varying vec2 vUv;

  // Simple noise for shimmer
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    // Base color with slight view-angle iridescence
    float iriShift = vFresnel * uIridescence * 0.3;
    vec3 color = uBaseColor;
    // Shift hue via simple rotation in RGB space
    color.r += iriShift * 0.2;
    color.g -= iriShift * 0.1;
    color.b += iriShift * 0.3;

    // Inner glow: heartbeat pulse from core
    float pulse = sin(uTime * uPulseSpeed) * 0.5 + 0.5;
    float coreDist = length(vWorldPosition);
    float innerFade = exp(-coreDist * 3.0) * uInnerGlow;
    color = mix(color, uInnerColor, innerFade * (0.6 + pulse * 0.4));

    // Subsurface scattering approximation
    // Light passing through thin parts (edges glow with back-light)
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
    float sss = max(0.0, dot(vViewDir, -lightDir + vNormal * 0.5));
    sss = pow(sss, 3.0) * uSubsurface;
    color += uBaseColor * sss * 0.4;

    // Fresnel rim glow: edges lit up like bioluminescence
    vec3 rim = uRimColor * vFresnel * uRimIntensity;
    color += rim;

    // Subtle surface shimmer
    float shimmer = hash(vWorldPosition * 20.0 + uTime * 0.5);
    color += shimmer * 0.03 * uRimColor;

    // Alpha: near-opaque face-on, slight glow falloff at edges
    float alpha = uOpacity * (0.87 + vFresnel * 0.13);
    // Brightness boost — self-illuminated, no scene lights needed
    color *= 1.4;
    gl_FragColor = vec4(color, alpha);
  }
`;

export type LivingMaterialParams = {
  baseColor: THREE.Color;
  rimColor: THREE.Color;
  innerColor: THREE.Color;
  pulseSpeed: number;
  rimIntensity: number;
  innerGlow: number;
  opacity: number;
  iridescence: number;
  subsurface: number;
};

export function createLivingMaterial(params: LivingMaterialParams): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uBaseColor: { value: params.baseColor },
      uRimColor: { value: params.rimColor },
      uInnerColor: { value: params.innerColor },
      uTime: { value: 0 },
      uPulseSpeed: { value: params.pulseSpeed },
      uRimIntensity: { value: params.rimIntensity },
      uInnerGlow: { value: params.innerGlow },
      uOpacity: { value: params.opacity },
      uIridescence: { value: params.iridescence },
      uSubsurface: { value: params.subsurface },
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: true,
  });
}

/**
 * Derive living material parameters from DNA appearance.
 */
export function deriveLivingMaterialParams(
  primaryColor: THREE.Color,
  secondaryColor: THREE.Color,
  glowIntensity: number,
  dna: { creativity: number; openness: number; intensity: number; warmth: number; intuitive: number },
): LivingMaterialParams {
  // Rim color: shifted brighter version of primary
  const rimColor = primaryColor.clone();
  rimColor.offsetHSL(0.05, 0.1, 0.2);

  // Inner glow color: warm core light
  const innerColor = new THREE.Color().lerpColors(
    primaryColor,
    new THREE.Color(1, 0.9, 0.7), // warm white
    0.4 + dna.warmth * 0.3,
  );

  return {
    baseColor: primaryColor,
    rimColor,
    innerColor,
    pulseSpeed: 1.5 + dna.intensity * 1.5, // heart rate
    rimIntensity: 0.3 + dna.openness * 0.5 + glowIntensity * 0.3,
    innerGlow: 0.2 + dna.warmth * 0.4 + glowIntensity * 0.2,
    opacity: 0.95,
    iridescence: dna.creativity * 0.6 + dna.intuitive * 0.3,
    subsurface: 0.3 + dna.warmth * 0.4,
  };
}

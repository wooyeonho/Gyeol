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
  uniform float uBrightness;

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

    // Brightness boost — self-illuminated, no scene lights needed
    color *= uBrightness;

    // Fully opaque core, slight edge transparency for glow feel
    float alpha = uOpacity * (0.92 + vFresnel * 0.08);
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
  brightness: number;
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
      uBrightness: { value: params.brightness },
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: true,
  });
}

/**
 * Derive living material parameters from DNA appearance.
 * Optionally accepts an archetype to vary material per species type.
 */
export function deriveLivingMaterialParams(
  primaryColor: THREE.Color,
  secondaryColor: THREE.Color,
  glowIntensity: number,
  dna: { creativity: number; openness: number; intensity: number; warmth: number; intuitive: number },
  archetype?: string,
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

  // Base (DNA-driven) values
  let pulseSpeed = 1.5 + dna.intensity * 1.5;
  let rimIntensity = 0.3 + dna.openness * 0.5 + glowIntensity * 0.3;
  let innerGlow = 0.2 + dna.warmth * 0.4 + glowIntensity * 0.2;
  let opacity = 0.95;
  let iridescence = dna.creativity * 0.6 + dna.intuitive * 0.3;
  let subsurface = 0.3 + dna.warmth * 0.4;
  let brightness = 1.4;

  // Archetype-specific overrides
  switch (archetype) {
    case "organic":
      rimIntensity = 0.15 + dna.openness * 0.2 + glowIntensity * 0.1;
      subsurface = 0.5 + dna.warmth * 0.4; // skin-like feel
      brightness = 1.1;
      break;
    case "crystalline":
      rimIntensity = 0.5 + dna.openness * 0.5 + glowIntensity * 0.3;
      subsurface = 0.1 + dna.warmth * 0.15;
      iridescence = 0.6 + dna.creativity * 0.4 + dna.intuitive * 0.3;
      brightness = 1.3;
      break;
    case "ethereal":
      // Keep current high glow behavior — the only archetype that should look "glowy"
      brightness = 1.4;
      break;
    case "volcanic":
      innerGlow = 0.5 + dna.warmth * 0.5 + glowIntensity * 0.3;
      rimIntensity = 0.08 + dna.openness * 0.1;
      pulseSpeed = (1.5 + dna.intensity * 1.5) * 3; // 3x pulse speed
      brightness = 1.3;
      break;
    case "mechanical":
      subsurface = 0.05 + dna.warmth * 0.05;
      rimIntensity = 0.1 + dna.openness * 0.1;
      opacity = 0.99;
      iridescence = 0;
      brightness = 1.15;
      break;
    case "verdant":
      subsurface = 0.35 + dna.warmth * 0.3;
      rimIntensity = 0.12 + dna.openness * 0.15;
      pulseSpeed = 0.8 + dna.intensity * 0.5; // low pulse
      brightness = 1.15;
      break;
    case "spectral":
      rimIntensity = 0.5 + dna.openness * 0.6 + glowIntensity * 0.3;
      opacity = 0.7;
      iridescence = 0.7 + dna.creativity * 0.3;
      brightness = 1.3;
      break;
    case "fluid":
      subsurface = 0.4 + dna.warmth * 0.35;
      rimIntensity = 0.25 + dna.openness * 0.3;
      brightness = 1.25;
      break;
    default:
      // Unknown archetype — use DNA-driven defaults with moderate brightness
      brightness = 1.3;
      break;
  }

  return {
    baseColor: primaryColor,
    rimColor,
    innerColor,
    pulseSpeed,
    rimIntensity,
    innerGlow,
    opacity,
    iridescence,
    subsurface,
    brightness,
  };
}

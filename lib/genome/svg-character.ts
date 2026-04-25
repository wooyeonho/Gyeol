// SVG-based procedural character renderer.
// Maps the 32 DNA axes to a deterministic, lightweight, cute SVG.
// Designed as a minimal, mobile-first, share-friendly alternative to Three.js.

import type { CreatureDNA } from "./dna";

export type CharacterMood =
  | "calm"
  | "happy"
  | "curious"
  | "sleepy"
  | "sad"
  | "excited"
  | "love";

export type CharacterStage = 1 | 2 | 3 | 4 | 5;

export type CharacterRenderInput = {
  dna: CreatureDNA;
  mood?: CharacterMood;
  stage?: CharacterStage;
  /** 0..1 — affects aura intensity, eye gleam */
  vitality?: number;
  /** 0..1 — drives breathing/idle motion */
  energy?: number;
  /** Display scale multiplier (1 = default 320px viewbox) */
  scale?: number;
};

export type CharacterRenderResult = {
  svg: string;
  palette: { primary: string; secondary: string; aura: string; accent: string };
  pose: { tilt: number; bounce: number };
};

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hsl(h: number, s: number, l: number, a = 1) {
  return a < 1 ? `hsla(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}% / ${a})` : `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`;
}

// Deterministic hash → hue from a few DNA axes.
function dnaHue(dna: CreatureDNA): number {
  const seed =
    dna.warmth * 60 +
    dna.creativity * 80 +
    dna.intuitive * 40 +
    dna.elementalAffinity * 120;
  return (seed * 7.31) % 360;
}

function moodAdjust(mood: CharacterMood): { hueShift: number; satMul: number; lightMul: number; eye: "round" | "happy" | "curious" | "sleepy" | "sad" | "sparkle" | "heart"; mouth: "smile" | "open" | "soft" | "yawn" | "frown" | "grin" } {
  switch (mood) {
    case "happy":   return { hueShift: 8,   satMul: 1.15, lightMul: 1.05, eye: "happy",   mouth: "smile" };
    case "curious": return { hueShift: -8,  satMul: 1.1,  lightMul: 1.02, eye: "curious", mouth: "soft" };
    case "sleepy":  return { hueShift: -12, satMul: 0.85, lightMul: 0.92, eye: "sleepy",  mouth: "yawn" };
    case "sad":     return { hueShift: -22, satMul: 0.7,  lightMul: 0.85, eye: "sad",     mouth: "frown" };
    case "excited": return { hueShift: 14,  satMul: 1.25, lightMul: 1.08, eye: "sparkle", mouth: "grin" };
    case "love":    return { hueShift: -4,  satMul: 1.2,  lightMul: 1.05, eye: "heart",   mouth: "soft" };
    case "calm":
    default:        return { hueShift: 0,   satMul: 1,    lightMul: 1,    eye: "round",   mouth: "soft" };
  }
}

function buildPalette(dna: CreatureDNA, mood: CharacterMood) {
  const hueBase = dnaHue(dna);
  const adj = moodAdjust(mood);
  const hue = (hueBase + adj.hueShift + 360) % 360;
  const sat = clamp(58 + dna.creativity * 30 + dna.intensity * 6, 35, 95) * adj.satMul;
  const light = clamp(64 + dna.warmth * 12 - dna.analytical * 8, 45, 82) * adj.lightMul;

  const primary = hsl(hue, sat, clamp(light, 35, 85));
  const secondary = hsl((hue + 28) % 360, clamp(sat * 0.85, 30, 90), clamp(light + 10, 45, 92));
  const accent = hsl((hue + 200) % 360, clamp(sat * 0.95, 40, 95), clamp(light - 6, 30, 80));
  const aura = hsl(hue, clamp(sat * 1.05, 40, 100), clamp(light + 14, 55, 95), 0.5);
  return { primary, secondary, aura, accent };
}

function buildBody(dna: CreatureDNA, stage: CharacterStage) {
  // Body shape: 0 = round blob, 1 = elongated tear-drop. Stage scales overall size.
  const stageScale = 0.78 + stage * 0.045;
  const w = lerp(120, 92, dna.bodyShape) * stageScale;
  const h = lerp(110, 150, dna.bodyShape) * stageScale;
  const headFactor = 0.55 + dna.headRatio * 0.35;
  const headR = (w * headFactor) / 2;
  return { w, h, headR, stageScale };
}

function eyePath(kind: "round" | "happy" | "curious" | "sleepy" | "sad" | "sparkle" | "heart", cx: number, cy: number, r: number, color: string, gleam: boolean) {
  const gleamSvg = gleam
    ? `<circle cx="${(cx - r * 0.32).toFixed(1)}" cy="${(cy - r * 0.32).toFixed(1)}" r="${(r * 0.32).toFixed(1)}" fill="white"/>`
    : "";
  switch (kind) {
    case "happy":
      return `<path d="M ${cx - r} ${cy} Q ${cx} ${cy - r * 1.2} ${cx + r} ${cy}" stroke="${color}" stroke-width="${(r * 0.55).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
    case "sleepy":
      return `<path d="M ${cx - r} ${cy} Q ${cx} ${cy + r * 0.5} ${cx + r} ${cy}" stroke="${color}" stroke-width="${(r * 0.55).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
    case "sad":
      return `<path d="M ${cx - r} ${cy + r * 0.4} Q ${cx} ${cy - r * 0.6} ${cx + r} ${cy + r * 0.4}" stroke="${color}" stroke-width="${(r * 0.5).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
    case "curious":
      return `<ellipse cx="${cx}" cy="${cy}" rx="${(r * 0.7).toFixed(1)}" ry="${(r * 1.05).toFixed(1)}" fill="${color}"/>${gleamSvg}`;
    case "sparkle":
      return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="${color}"/>${gleamSvg}<circle cx="${(cx + r * 0.3).toFixed(1)}" cy="${(cy + r * 0.4).toFixed(1)}" r="${(r * 0.18).toFixed(1)}" fill="white"/>`;
    case "heart":
      return `<path d="M ${cx} ${cy + r * 0.6} L ${cx - r} ${cy - r * 0.2} A ${(r * 0.5).toFixed(1)} ${(r * 0.5).toFixed(1)} 0 0 1 ${cx} ${cy - r * 0.4} A ${(r * 0.5).toFixed(1)} ${(r * 0.5).toFixed(1)} 0 0 1 ${cx + r} ${cy - r * 0.2} Z" fill="${color}"/>`;
    case "round":
    default:
      return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="${color}"/>${gleamSvg}`;
  }
}

function mouthPath(kind: "smile" | "open" | "soft" | "yawn" | "frown" | "grin", cx: number, cy: number, w: number, color: string) {
  const h = w * 0.35;
  switch (kind) {
    case "smile":
      return `<path d="M ${cx - w / 2} ${cy} Q ${cx} ${cy + h} ${cx + w / 2} ${cy}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
    case "grin":
      return `<path d="M ${cx - w / 2} ${cy - h * 0.2} Q ${cx} ${cy + h * 1.4} ${cx + w / 2} ${cy - h * 0.2}" stroke="${color}" stroke-width="2.6" stroke-linecap="round" fill="${color}" fill-opacity="0.18"/>`;
    case "open":
      return `<ellipse cx="${cx}" cy="${cy + h * 0.4}" rx="${(w * 0.25).toFixed(1)}" ry="${(h * 0.7).toFixed(1)}" fill="${color}" fill-opacity="0.65"/>`;
    case "yawn":
      return `<ellipse cx="${cx}" cy="${cy + h * 0.4}" rx="${(w * 0.3).toFixed(1)}" ry="${(h * 1.1).toFixed(1)}" fill="${color}" fill-opacity="0.6"/>`;
    case "frown":
      return `<path d="M ${cx - w / 2} ${cy + h * 0.4} Q ${cx} ${cy - h * 0.4} ${cx + w / 2} ${cy + h * 0.4}" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    case "soft":
    default:
      return `<path d="M ${cx - w / 3} ${cy} Q ${cx} ${cy + h * 0.5} ${cx + w / 3} ${cy}" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  }
}

function patternOverlay(dna: CreatureDNA, w: number, h: number, color: string) {
  if (dna.patternComplexity < 0.35) return "";
  const dots = Math.round(lerp(3, 11, dna.patternComplexity));
  let out = "";
  for (let i = 0; i < dots; i++) {
    // deterministic pseudo-random from i and DNA
    const a = (i * 0.6180339887 + dna.creativity * 0.7) % 1;
    const b = (i * 0.7548776662 + dna.intuitive * 0.5) % 1;
    const r = lerp(2, 6, ((i * 13) % 7) / 7);
    const x = lerp(-w * 0.32, w * 0.32, a);
    const y = lerp(-h * 0.18, h * 0.28, b);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" fill-opacity="${(0.2 + dna.patternComplexity * 0.35).toFixed(2)}"/>`;
  }
  return out;
}

function antennae(dna: CreatureDNA, headR: number, color: string) {
  if (dna.limbLength < 0.3 && dna.elementalAffinity < 0.4) return "";
  const len = lerp(8, 28, dna.limbLength);
  const sway = (dna.playfulness - 0.5) * 12;
  return `
    <g stroke="${color}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.85">
      <path d="M -${(headR * 0.35).toFixed(1)} -${headR.toFixed(1)} q ${(-3 + sway).toFixed(1)} -${(len * 0.5).toFixed(1)} 0 -${len.toFixed(1)}"/>
      <path d="M ${(headR * 0.35).toFixed(1)} -${headR.toFixed(1)} q ${(3 + sway).toFixed(1)} -${(len * 0.5).toFixed(1)} 0 -${len.toFixed(1)}"/>
    </g>
    <circle cx="-${(headR * 0.35).toFixed(1)}" cy="-${(headR + len).toFixed(1)}" r="3.2" fill="${color}"/>
    <circle cx="${(headR * 0.35).toFixed(1)}" cy="-${(headR + len).toFixed(1)}" r="3.2" fill="${color}"/>
  `;
}

function blush(dna: CreatureDNA, headR: number, accent: string) {
  if (dna.blushIntensity < 0.35) return "";
  const op = clamp(dna.blushIntensity * 0.55, 0, 0.55);
  const cy = headR * 0.25;
  const r = headR * 0.18;
  return `
    <ellipse cx="-${(headR * 0.55).toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.65).toFixed(1)}" fill="${accent}" fill-opacity="${op.toFixed(2)}"/>
    <ellipse cx="${(headR * 0.55).toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.65).toFixed(1)}" fill="${accent}" fill-opacity="${op.toFixed(2)}"/>
  `;
}

/**
 * Render a deterministic SVG portrait of a creature from its DNA + state.
 * Returns inline SVG string (no <?xml?> header) ready to drop into JSX via dangerouslySetInnerHTML
 * or to wrap with the <Character/> component in components/character/character.tsx.
 */
export function renderCharacterSvg(input: CharacterRenderInput): CharacterRenderResult {
  const { dna } = input;
  const mood = input.mood ?? "calm";
  const stage = input.stage ?? 2;
  const vitality = clamp(input.vitality ?? 0.85);
  const energy = clamp(input.energy ?? 0.7);
  const scale = input.scale ?? 1;

  const palette = buildPalette(dna, mood);
  const body = buildBody(dna, stage);
  const adj = moodAdjust(mood);

  const eyeR = lerp(5, 14, dna.eyeSize) * body.stageScale;
  const eyeSpread = body.headR * 0.5;
  const eyeY = -body.headR * 0.12;
  const mouthW = lerp(18, 32, dna.mouthExpressiveness) * body.stageScale;
  const mouthY = body.headR * 0.42;
  const gleam = vitality > 0.4 && (mood === "happy" || mood === "excited" || mood === "curious" || mood === "love");

  // Aura intensity scales with vitality + glowReactivity.
  const auraR = body.headR * (1.5 + dna.glowReactivity * 0.6);
  const auraOpacity = clamp(0.18 + vitality * 0.35 + dna.glowReactivity * 0.25, 0, 0.85);

  // Idle motion params (consumer animates with CSS based on data attrs).
  const tilt = (dna.playfulness - 0.5) * 6;
  const bounce = energy * 4 + dna.locomotionStyle * 4;

  const view = 320 * scale;
  const cx = view / 2;
  const cy = view / 2;

  const bodyOpacity = clamp(0.92 - dna.transparency * 0.4, 0.4, 1);
  const strokeColor = `hsla(0 0% 0% / ${(0.35 - dna.transparency * 0.2).toFixed(2)})`;
  const featureColor = `hsl(${((dnaHue(dna) + 200) % 360).toFixed(0)} 35% 22%)`;

  const svg = `
<svg viewBox="0 0 ${view} ${view}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="creature portrait">
  <defs>
    <radialGradient id="grad-body" cx="35%" cy="32%" r="78%">
      <stop offset="0%" stop-color="${palette.secondary}"/>
      <stop offset="65%" stop-color="${palette.primary}"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0.85"/>
    </radialGradient>
    <radialGradient id="grad-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.aura}" stop-opacity="${auraOpacity.toFixed(2)}"/>
      <stop offset="100%" stop-color="${palette.aura}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- aura halo -->
  <circle cx="${cx}" cy="${cy}" r="${(auraR * 1.6).toFixed(1)}" fill="url(#grad-aura)"/>

  <g transform="translate(${cx} ${cy}) rotate(${tilt.toFixed(1)})">
    <!-- shadow under body -->
    <ellipse cx="0" cy="${(body.h * 0.55).toFixed(1)}" rx="${(body.w * 0.55).toFixed(1)}" ry="6" fill="black" fill-opacity="0.18"/>

    <!-- body -->
    <ellipse cx="0" cy="0" rx="${(body.w / 2).toFixed(1)}" ry="${(body.h / 2).toFixed(1)}" fill="url(#grad-body)" fill-opacity="${bodyOpacity.toFixed(2)}" stroke="${strokeColor}" stroke-width="1.5" filter="url(#soft-shadow)"/>

    <!-- pattern overlay -->
    ${patternOverlay(dna, body.w, body.h, palette.accent)}

    <!-- antennae / ears -->
    ${antennae(dna, body.headR, palette.accent)}

    <!-- head region (no second circle — body acts as head when small) -->
    <g transform="translate(0 ${(-body.h * 0.1).toFixed(1)})">
      ${blush(dna, body.headR, palette.accent)}
      <!-- eyes -->
      ${eyePath(adj.eye, -eyeSpread, eyeY, eyeR, featureColor, gleam)}
      ${eyePath(adj.eye, eyeSpread, eyeY, eyeR, featureColor, gleam)}
      <!-- mouth -->
      ${mouthPath(adj.mouth, 0, mouthY, mouthW, featureColor)}
    </g>
  </g>
</svg>`.trim();

  return { svg, palette, pose: { tilt, bounce } };
}

/**
 * Tiny helper: derive mood from agent state fields commonly available in the store.
 */
export function deriveMood(state: { mood?: string | null; vitality?: number | null }): CharacterMood {
  const m = (state.mood ?? "").toLowerCase();
  if (m.includes("love") || m.includes("affection")) return "love";
  if (m.includes("excit") || m.includes("joy")) return "excited";
  if (m.includes("happy") || m.includes("warm")) return "happy";
  if (m.includes("curious") || m.includes("wonder")) return "curious";
  if (m.includes("sad") || m.includes("blue") || m.includes("melan")) return "sad";
  if (m.includes("sleep") || m.includes("tired") || m.includes("drowsy")) return "sleepy";
  if ((state.vitality ?? 1) < 0.3) return "sad";
  if ((state.vitality ?? 1) < 0.55) return "sleepy";
  return "calm";
}

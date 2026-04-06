"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResolvedIdentityAppearance, IdentityFormKey } from "@/lib/identity/appearance";

/* ================================================================
 *  PixelCreature — Pokémon-era pixel sprite generator
 *
 *  Every creature is procedurally unique, derived from DNA fields:
 *    formKey   → base silhouette algorithm
 *    palette   → 4-color sprite palette (outline / shadow / main / highlight)
 *    presence  → body proportions (node/band counts → appendages)
 *    visual    → glow, particles, animation speed
 *    vitality  → energy level affects posture & brightness
 *    mood      → eye expression
 *
 *  Style references: Pokémon Gen 1-2 (Game Boy Color), Tamagotchi
 *  - Black pixel outline around entire body
 *  - 3-4 color limited palette
 *  - Mirrored left-right symmetry
 *  - 2-frame idle animation (classic standing sprite bob)
 *  - 12fps for authentic retro feel
 * ================================================================ */

type PresenceSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<PresenceSize, number> = { sm: 56, md: 80, lg: 112 };
const GRID = 24; // 24×24 pixel grid — enough detail for pokémon-style sprites

// ── Deterministic RNG from string seed ──
function createRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

// ── Color helpers ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) || 80,
    parseInt(h.slice(2, 4), 16) || 80,
    parseInt(h.slice(4, 6), 16) || 120,
  ];
}

function rgbStr(r: number, g: number, b: number, a = 1) {
  return `rgba(${r},${g},${b},${a})`;
}

/** Build a 4-color Pokémon-style palette from one hex color. */
function buildPalette(primary: string, secondary: string) {
  const [pr, pg, pb] = hexToRgb(primary);
  const [sr, sg, sb] = hexToRgb(secondary);
  return {
    outline: rgbStr(15, 15, 20),                                             // near-black
    shadow: rgbStr(Math.round(pr * 0.45), Math.round(pg * 0.45), Math.round(pb * 0.45)),  // dark shade
    main: rgbStr(pr, pg, pb),                                                // main body
    light: rgbStr(
      Math.min(255, Math.round(pr * 1.3 + 40)),
      Math.min(255, Math.round(pg * 1.3 + 40)),
      Math.min(255, Math.round(pb * 1.3 + 40)),
    ),                                                                       // highlight
    accent: rgbStr(sr, sg, sb),                                              // secondary accent
    eyeWhite: rgbStr(240, 240, 245),
    eyePupil: rgbStr(20, 20, 30),
  };
}

// ── Cell type for the sprite grid ──
// 0=empty, 1=outline, 2=shadow, 3=main, 4=highlight, 5=accent, 6=eyeWhite, 7=eyePupil
type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Procedurally generate a 24×24 sprite grid from DNA.
 * The body is grown from the center outward, then mirrored,
 * then features (ears, horns, tail, limbs) are added based on formKey.
 */
function generateSprite(
  appearance: ResolvedIdentityAppearance,
  frame: 0 | 1,
): Cell[][] {
  const grid: Cell[][] = Array.from({ length: GRID }, () => Array(GRID).fill(0) as Cell[]);
  const mid = Math.floor(GRID / 2); // 12
  const rng = createRng(
    appearance.palette.primary + appearance.formKey + appearance.presence.shellRadius,
  );

  // ── 1. Generate body core (half-width, mirrored) ──
  // Body occupies roughly rows 6..19, columns mid-6..mid (then mirrored)
  const bodyTop = 7 + (frame === 1 ? 1 : 0); // frame 1 bobs up slightly
  const bodyHeight = 10 + Math.floor(rng() * 3); // 10-12 rows
  const maxHalfWidth = 5 + Math.floor(rng() * 3); // 5-7 half-width

  // Build half-widths per row (grow from top, bulge in middle, taper at bottom)
  const halfWidths: number[] = [];
  for (let r = 0; r < bodyHeight; r++) {
    const t = r / (bodyHeight - 1); // 0 at top, 1 at bottom
    // Bell curve shape: narrow at top/bottom, wide in middle
    const bellBase = Math.sin(t * Math.PI);
    // Add some DNA-driven noise
    const noise = (rng() - 0.5) * 1.2;
    const hw = Math.round(bellBase * maxHalfWidth + noise);
    halfWidths.push(Math.max(2, Math.min(maxHalfWidth + 1, hw)));
  }

  // Head is top ~40%: make it relatively wider based on formKey
  const headRatio = appearance.formKey === "crown-shell" ? 0.5
    : appearance.formKey === "bloom-shell" ? 0.45
    : 0.35;
  const headRows = Math.floor(bodyHeight * headRatio);
  for (let r = 0; r < headRows; r++) {
    halfWidths[r] = Math.max(halfWidths[r], maxHalfWidth - 1);
  }

  // Fill body cells (mirrored)
  for (let r = 0; r < bodyHeight; r++) {
    const y = bodyTop + r;
    if (y >= GRID) break;
    const hw = halfWidths[r];
    for (let dx = 0; dx < hw; dx++) {
      const leftX = mid - 1 - dx;
      const rightX = mid + dx;
      if (leftX >= 0 && leftX < GRID) grid[y][leftX] = 3;
      if (rightX >= 0 && rightX < GRID) grid[y][rightX] = 3;
    }
  }

  // ── 2. Add features based on formKey ──
  const bodyBottom = bodyTop + bodyHeight - 1;

  switch (appearance.formKey) {
    case "seed-shell":
      // Round blob with small stubby legs
      addLegs(grid, mid, bodyBottom, 2, 2);
      // Small round ears
      addEars(grid, mid, bodyTop, halfWidths[0], "round", rng);
      break;
    case "veil-shell":
      // Ghost-like: no legs, wavy bottom, tall ears/horns
      addWavyBottom(grid, mid, bodyBottom, halfWidths[bodyHeight - 1], rng);
      addEars(grid, mid, bodyTop, halfWidths[0], "tall", rng);
      break;
    case "prism-shell":
      // Angular: spike ears, thin legs
      addLegs(grid, mid, bodyBottom, 3, 1);
      addEars(grid, mid, bodyTop, halfWidths[0], "spike", rng);
      break;
    case "crown-shell":
      // Regal: crown points, thick arms
      addLegs(grid, mid, bodyBottom, 2, 2);
      addCrown(grid, mid, bodyTop, halfWidths[0]);
      addArms(grid, mid, bodyTop + headRows, halfWidths[headRows], rng);
      break;
    case "bloom-shell":
      // Flower: petal ears, stubby legs
      addLegs(grid, mid, bodyBottom, 2, 2);
      addEars(grid, mid, bodyTop, halfWidths[0], "petal", rng);
      // Add petal accents (mark as accent color)
      addPetalAccents(grid, mid, bodyTop, halfWidths[0]);
      break;
    case "spike-shell":
      // Jagged: spikes on back, clawed feet
      addLegs(grid, mid, bodyBottom, 3, 2);
      addEars(grid, mid, bodyTop, halfWidths[0], "spike", rng);
      addSpikes(grid, mid, bodyTop, bodyHeight, halfWidths, rng);
      break;
  }

  // ── 3. Add tail (based on DNA) ──
  const tailSide = rng() > 0.5 ? 1 : -1;
  const tailLength = 2 + Math.floor(rng() * 3);
  const tailY = bodyTop + Math.floor(bodyHeight * 0.6);
  const tailBaseX = mid + tailSide * (halfWidths[Math.floor(bodyHeight * 0.6)] || 3);
  for (let i = 0; i < tailLength; i++) {
    const tx = tailBaseX + tailSide * i;
    const ty = tailY - Math.floor(i * 0.4);
    if (tx >= 0 && tx < GRID && ty >= 0 && ty < GRID && grid[ty][tx] === 0) {
      grid[ty][tx] = 3;
    }
  }

  // ── 4. Apply shading ──
  // Top rows of body → highlight (4), bottom rows → shadow (2)
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (grid[y][x] !== 3) continue;
      const relY = (y - bodyTop) / bodyHeight;
      if (relY < 0.2) grid[y][x] = 4;        // top highlight
      else if (relY > 0.8) grid[y][x] = 2;   // bottom shadow
      // Also: left edge gets shadow for 3D feel
      if (x < mid - 1 && grid[y][x - 1] === 0 && grid[y][x] === 3) {
        grid[y][x] = 2;
      }
    }
  }

  // ── 5. Eyes ──
  const eyeY = bodyTop + Math.floor(headRows * 0.55) + (frame === 1 ? 1 : 0);
  const eyeSpacing = Math.max(2, Math.floor(halfWidths[0] * 0.5));
  const leftEyeX = mid - eyeSpacing;
  const rightEyeX = mid + eyeSpacing - 1;

  // Place eye whites
  setCell(grid, leftEyeX, eyeY, 6);
  setCell(grid, leftEyeX + 1, eyeY, 6);
  setCell(grid, leftEyeX, eyeY + 1, 6);
  setCell(grid, leftEyeX + 1, eyeY + 1, 6);

  setCell(grid, rightEyeX, eyeY, 6);
  setCell(grid, rightEyeX + 1, eyeY, 6);
  setCell(grid, rightEyeX, eyeY + 1, 6);
  setCell(grid, rightEyeX + 1, eyeY + 1, 6);

  // Pupils
  setCell(grid, leftEyeX + 1, eyeY + 1, 7);
  setCell(grid, rightEyeX, eyeY + 1, 7);

  // Eye highlight (top-right of each eye)
  setCell(grid, leftEyeX + 1, eyeY, 6);
  setCell(grid, rightEyeX + 1, eyeY, 6);

  // ── 6. Auto-outline ──
  // Any non-empty cell adjacent to an empty cell gets outlined
  const outlined: Cell[][] = Array.from({ length: GRID }, () => Array(GRID).fill(0) as Cell[]);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      outlined[y][x] = grid[y][x];
    }
  }
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (grid[y][x] !== 0) continue;
      // Check 4-neighbors
      const hasBody =
        (y > 0 && grid[y - 1][x] > 1) ||
        (y < GRID - 1 && grid[y + 1][x] > 1) ||
        (x > 0 && grid[y][x - 1] > 1) ||
        (x < GRID - 1 && grid[y][x + 1] > 1);
      if (hasBody) outlined[y][x] = 1;
    }
  }

  return outlined;
}

function setCell(grid: Cell[][], x: number, y: number, v: Cell) {
  if (x >= 0 && x < GRID && y >= 0 && y < GRID) grid[y][x] = v;
}

// ── Feature generators ──

function addLegs(grid: Cell[][], mid: number, bottom: number, spacing: number, height: number) {
  for (let dy = 1; dy <= height; dy++) {
    setCell(grid, mid - spacing, bottom + dy, 3);
    setCell(grid, mid + spacing - 1, bottom + dy, 3);
    // Foot
    if (dy === height) {
      setCell(grid, mid - spacing - 1, bottom + dy, 3);
      setCell(grid, mid + spacing, bottom + dy, 3);
    }
  }
}

function addEars(
  grid: Cell[][],
  mid: number,
  top: number,
  headHW: number,
  style: "round" | "tall" | "spike" | "petal",
  rng: () => number,
) {
  const earX = Math.max(2, headHW - 1);
  switch (style) {
    case "round":
      setCell(grid, mid - earX, top - 1, 3);
      setCell(grid, mid - earX + 1, top - 1, 3);
      setCell(grid, mid + earX - 1, top - 1, 3);
      setCell(grid, mid + earX - 2, top - 1, 3);
      break;
    case "tall":
      for (let dy = 1; dy <= 3; dy++) {
        setCell(grid, mid - earX, top - dy, 3);
        setCell(grid, mid + earX - 1, top - dy, 3);
      }
      setCell(grid, mid - earX, top - 4, 4); // tip highlight
      setCell(grid, mid + earX - 1, top - 4, 4);
      break;
    case "spike":
      setCell(grid, mid - earX, top - 1, 3);
      setCell(grid, mid - earX + 1, top - 2, 3);
      setCell(grid, mid - earX + 1, top - 3, 4);
      setCell(grid, mid + earX - 1, top - 1, 3);
      setCell(grid, mid + earX - 2, top - 2, 3);
      setCell(grid, mid + earX - 2, top - 3, 4);
      break;
    case "petal":
      // Rounded, wider petal shapes
      for (let dy = 1; dy <= 2; dy++) {
        setCell(grid, mid - earX, top - dy, 5);
        setCell(grid, mid - earX - 1, top - dy, 5);
        setCell(grid, mid + earX - 1, top - dy, 5);
        setCell(grid, mid + earX, top - dy, 5);
      }
      setCell(grid, mid - earX, top - 3, 5);
      setCell(grid, mid + earX - 1, top - 3, 5);
      break;
  }
}

function addCrown(grid: Cell[][], mid: number, top: number, headHW: number) {
  const w = Math.max(3, headHW);
  // Three crown points
  for (let dx = -w; dx < w; dx++) {
    setCell(grid, mid + dx, top - 1, 5);
  }
  // Points
  setCell(grid, mid - w + 1, top - 2, 5);
  setCell(grid, mid, top - 2, 5);
  setCell(grid, mid + w - 2, top - 2, 5);
  setCell(grid, mid, top - 3, 5);
}

function addArms(grid: Cell[][], mid: number, armY: number, bodyHW: number, rng: () => number) {
  const armLen = 2 + Math.floor(rng() * 2);
  for (let i = 1; i <= armLen; i++) {
    setCell(grid, mid - bodyHW - i, armY + Math.floor(i * 0.5), 3);
    setCell(grid, mid + bodyHW + i - 1, armY + Math.floor(i * 0.5), 3);
  }
}

function addWavyBottom(grid: Cell[][], mid: number, bottom: number, hw: number, rng: () => number) {
  for (let dx = -hw; dx < hw; dx++) {
    const wave = Math.round(Math.sin(dx * 1.2) * 1.5);
    if (wave > 0) {
      for (let dy = 0; dy < wave; dy++) {
        setCell(grid, mid + dx, bottom + 1 + dy, 2);
      }
    }
  }
}

function addSpikes(
  grid: Cell[][],
  mid: number,
  bodyTop: number,
  bodyHeight: number,
  halfWidths: number[],
  rng: () => number,
) {
  // Spikes along the right side of body
  const spikeCount = 2 + Math.floor(rng() * 3);
  for (let s = 0; s < spikeCount; s++) {
    const row = Math.floor(bodyHeight * (0.2 + (s / spikeCount) * 0.6));
    const y = bodyTop + row;
    const hw = halfWidths[row] || 3;
    // Right side spike
    setCell(grid, mid + hw, y - 1, 5);
    setCell(grid, mid + hw + 1, y, 5);
    setCell(grid, mid + hw, y, 5);
  }
}

function addPetalAccents(grid: Cell[][], mid: number, top: number, hw: number) {
  // Small accent dots on cheeks
  setCell(grid, mid - hw + 2, top + 3, 5);
  setCell(grid, mid + hw - 3, top + 3, 5);
}

// ── Mood → blink/expression ──
type Expression = "normal" | "happy" | "sleepy" | "surprised";

function getExpression(mood: string | null | undefined, vitality: number): Expression {
  if (vitality < 0.2) return "sleepy";
  if (mood === "happy" || mood === "playful" || mood === "excited") return "happy";
  if (mood === "surprised" || mood === "curious") return "surprised";
  if (mood === "sleepy" || mood === "tired" || mood === "calm") return "sleepy";
  return "normal";
}

// ================================================================
//  Main component
// ================================================================

export function PixelCreature({
  appearance,
  size = "md",
  mood,
}: {
  appearance: ResolvedIdentityAppearance;
  size?: PresenceSize;
  mood?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const frameRef = useRef(0);
  const blinkUntilRef = useRef(0);
  const bounceUntilRef = useRef(0);

  const displayPx = SIZE_MAP[size];
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  const canvasPx = GRID; // we draw at native grid resolution
  const expression = getExpression(mood ?? appearance.usageMode, appearance.vitality);
  const palette = buildPalette(appearance.palette.primary, appearance.palette.secondary);

  // Precompute both idle frames
  const sprite0 = useRef<Cell[][] | null>(null);
  const sprite1 = useRef<Cell[][] | null>(null);
  if (!sprite0.current) {
    sprite0.current = generateSprite(appearance, 0);
    sprite1.current = generateSprite(appearance, 1);
  }

  const colorForCell = useCallback(
    (cell: Cell): string | null => {
      switch (cell) {
        case 0: return null;
        case 1: return palette.outline;
        case 2: return palette.shadow;
        case 3: return palette.main;
        case 4: return palette.light;
        case 5: return palette.accent;
        case 6: return palette.eyeWhite;
        case 7: return palette.eyePupil;
        default: return null;
      }
    },
    [palette],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, frame: number) => {
      ctx.clearRect(0, 0, GRID, GRID);
      ctx.imageSmoothingEnabled = false;

      // Alternate between frame 0 and 1 every ~40 ticks (at 12fps ≈ 3.3s)
      const idleFrame = Math.floor(frame / 40) % 2 === 0 ? 0 : 1;
      const sprite = idleFrame === 0 ? sprite0.current! : sprite1.current!;

      const isBlink = frame < blinkUntilRef.current;
      const isBounce = frame < bounceUntilRef.current;

      // Bounce offset
      const bounceY = isBounce ? (Math.sin(frame * 0.8) > 0 ? -1 : 0) : 0;

      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          let cell = sprite[y][x];
          if (cell === 0) continue;

          // Blink: replace eye cells with outline
          if (isBlink && (cell === 6 || cell === 7)) {
            // Only draw a thin line for blink
            if (cell === 7) {
              cell = 1;
            } else {
              continue; // hide eye white during blink
            }
          }

          // Happy expression: modify eyes
          if (expression === "happy" && cell === 6) {
            continue; // hide white, eyes become ^_^ arcs (outline only)
          }
          if (expression === "happy" && cell === 7) {
            cell = 1; // pupil becomes outline arc
          }

          // Sleepy: half the eye
          if (expression === "sleepy" && cell === 6) {
            // Only show bottom half of eye
            const aboveIsEye = y > 0 && (sprite[y - 1][x] === 6 || sprite[y - 1][x] === 7);
            const belowIsEye = y < GRID - 1 && (sprite[y + 1][x] === 6 || sprite[y + 1][x] === 7);
            if (!belowIsEye && aboveIsEye) {
              // Bottom row of eye — keep
            } else {
              continue; // hide top part
            }
          }

          const color = colorForCell(cell);
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(x, y + bounceY, 1, 1);
        }
      }

      // Low vitality overlay
      if (appearance.vitality < 0.25) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, GRID, GRID);
      }
    },
    [appearance.vitality, colorForCell, expression],
  );

  // ── Animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let lastTime = 0;
    const FPS = 12;
    const interval = 1000 / FPS;

    function tick(time: number) {
      if (!running) return;
      rafRef.current = requestAnimationFrame(tick);
      if (time - lastTime < interval) return;
      lastTime = time;

      const frame = ++frameRef.current;

      // Random blink (every ~3-7 seconds)
      if (Math.random() < 0.006 && frame > blinkUntilRef.current) {
        blinkUntilRef.current = frame + 3; // blink lasts 3 frames
      }

      draw(ctx!, frame);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // ── Touch → bounce reaction ──
  const handleTap = useCallback(() => {
    bounceUntilRef.current = frameRef.current + 8;
    blinkUntilRef.current = frameRef.current + 2;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={GRID}
      height={GRID}
      onClick={handleTap}
      onTouchStart={handleTap}
      className="shrink-0 cursor-pointer"
      style={{
        width: displayPx,
        height: displayPx,
        imageRendering: "pixelated",
      }}
    />
  );
}

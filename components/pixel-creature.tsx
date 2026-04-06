"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResolvedIdentityAppearance, IdentityFormKey } from "@/lib/identity/appearance";

type PresenceSize = "sm" | "md" | "lg";

const PX_GRID: Record<PresenceSize, { cells: number; px: number }> = {
  sm: { cells: 12, px: 56 },
  md: { cells: 14, px: 80 },
  lg: { cells: 16, px: 112 },
};

// ── Simple deterministic hash for seed-based randomness ──
function seedRng(seed: string) {
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

// ── Parse hex color to RGB ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// ── Body shape templates per formKey (half-width, mirrored) ──
// Each is a set of rows [startCol, endCol] describing left half (mirrored to right)
type BodyTemplate = { rows: [number, number][]; eyeY: number; eyeInner: number; eyeOuter: number };

function getBodyTemplate(formKey: IdentityFormKey, gridSize: number): BodyTemplate {
  const mid = Math.floor(gridSize / 2);
  const s = gridSize / 14; // scale factor relative to 14-grid

  switch (formKey) {
    case "seed-shell": // round blob
      return {
        rows: scaleRows([
          [5, 7], [4, 7], [3, 7], [2, 7], [2, 7], [2, 7],
          [3, 7], [3, 7], [4, 7], [5, 7],
        ], s),
        eyeY: 3, eyeInner: Math.round(4 * s), eyeOuter: Math.round(6 * s),
      };
    case "veil-shell": // tall, ghost-like
      return {
        rows: scaleRows([
          [5, 7], [4, 7], [3, 7], [3, 7], [2, 7], [2, 7],
          [2, 7], [3, 7], [3, 7], [4, 6], [5, 7], [4, 6],
        ], s),
        eyeY: 3, eyeInner: Math.round(4 * s), eyeOuter: Math.round(6 * s),
      };
    case "prism-shell": // angular, diamond-ish
      return {
        rows: scaleRows([
          [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7],
          [2, 7], [3, 7], [4, 7], [5, 7],
        ], s),
        eyeY: 4, eyeInner: Math.round(3 * s), eyeOuter: Math.round(5 * s),
      };
    case "crown-shell": // wide, regal
      return {
        rows: scaleRows([
          [3, 5], [5, 7], [4, 7], [2, 7], [1, 7], [1, 7],
          [2, 7], [2, 7], [3, 7], [4, 7],
        ], s),
        eyeY: 4, eyeInner: Math.round(3 * s), eyeOuter: Math.round(5 * s),
      };
    case "bloom-shell": // soft, flower-like
      return {
        rows: scaleRows([
          [4, 6], [3, 7], [2, 7], [2, 7], [1, 7], [2, 7],
          [2, 7], [3, 7], [3, 7], [4, 6],
        ], s),
        eyeY: 3, eyeInner: Math.round(4 * s), eyeOuter: Math.round(6 * s),
      };
    case "spike-shell": // jagged
      return {
        rows: scaleRows([
          [5, 7], [3, 7], [4, 7], [2, 7], [1, 7], [2, 7],
          [1, 7], [3, 7], [4, 7], [5, 7],
        ], s),
        eyeY: 3, eyeInner: Math.round(3 * s), eyeOuter: Math.round(5 * s),
      };
  }
}

function scaleRows(rows: [number, number][], s: number): [number, number][] {
  return rows.map(([a, b]) => [Math.round(a * s), Math.round(b * s)]);
}

// ── Mood to eye expression ──
type EyeExpression = "open" | "happy" | "sleepy" | "surprised" | "angry";

function moodToExpression(mood: string | null | undefined, vitality: number): EyeExpression {
  if (vitality < 0.2) return "sleepy";
  if (mood === "happy" || mood === "playful" || mood === "excited") return "happy";
  if (mood === "sleepy" || mood === "tired" || mood === "calm") return "sleepy";
  if (mood === "surprised" || mood === "curious") return "surprised";
  if (mood === "angry" || mood === "frustrated") return "angry";
  return "open";
}

// ── Animation state machine ──
type AnimState = "idle" | "blink" | "bounce" | "squish";

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
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const stateRef = useRef<AnimState>("idle");
  const blinkTimerRef = useRef(0);
  const touchedRef = useRef(false);
  const [, setTick] = useState(0); // force re-render on touch

  const { cells, px } = PX_GRID[size];
  const cellSize = px / cells;
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

  const expression = moodToExpression(mood ?? appearance.usageMode, appearance.vitality);
  const template = getBodyTemplate(appearance.formKey, cells);
  const rng = seedRng(appearance.palette.primary + appearance.formKey);

  const primaryRgb = hexToRgb(appearance.palette.primary);
  const secondaryRgb = hexToRgb(appearance.palette.secondary);
  const ringRgb = hexToRgb(appearance.palette.ring);

  // Precompute body pixel map (mirrored)
  const bodyPixels = useCallback(() => {
    const map: Map<string, [number, number, number, number]> = new Map();
    const bodyStartY = Math.floor((cells - template.rows.length) / 2);
    const mid = Math.floor(cells / 2);
    const rand = seedRng(appearance.palette.primary + appearance.formKey + "body");

    for (let rowIdx = 0; rowIdx < template.rows.length; rowIdx++) {
      const [start, end] = template.rows[rowIdx];
      const y = bodyStartY + rowIdx;
      for (let x = start; x < end; x++) {
        // Left half
        const t = (rowIdx / template.rows.length) * 0.6 + rand() * 0.2;
        const color = lerpColor(primaryRgb, secondaryRgb, t);
        // Add subtle shading: darker at edges, lighter at center
        const distFromCenter = Math.abs(x - mid) / mid;
        const shade = 1 - distFromCenter * 0.25;
        const shaded: [number, number, number, number] = [
          Math.round(color[0] * shade),
          Math.round(color[1] * shade),
          Math.round(color[2] * shade),
          255,
        ];
        map.set(`${x},${y}`, shaded);
        // Mirror
        const mx = cells - 1 - x;
        if (mx !== x) {
          map.set(`${mx},${y}`, shaded);
        }
      }
    }
    return map;
  }, [appearance.formKey, appearance.palette.primary, cells, primaryRgb, secondaryRgb, template.rows]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, frame: number) => {
      const w = px * dpr;
      ctx.clearRect(0, 0, w, w);
      ctx.imageSmoothingEnabled = false;

      const state = stateRef.current;
      const body = bodyPixels();
      const bodyStartY = Math.floor((cells - template.rows.length) / 2);
      const mid = Math.floor(cells / 2);

      // ── Breathing offset: subtle vertical bob ──
      const breathPhase = Math.sin((frame * 0.04) * Math.PI * 2);
      const bobY = state === "bounce" ? Math.sin(frame * 0.3) * 2.5 * dpr : breathPhase * 0.8 * dpr;

      // ── Squish transform ──
      const squishX = state === "squish" ? 1.12 : 1;
      const squishY = state === "squish" ? 0.88 : 1;

      ctx.save();
      ctx.translate(w / 2, w / 2);
      ctx.scale(squishX, squishY);
      ctx.translate(-w / 2, -w / 2 + bobY);

      // ── Ambient glow under body ──
      const glowRadius = (cells * cellSize * dpr) * 0.55;
      const glow = ctx.createRadialGradient(
        w / 2, w / 2, 0,
        w / 2, w / 2, glowRadius,
      );
      glow.addColorStop(0, `rgba(${ringRgb[0]}, ${ringRgb[1]}, ${ringRgb[2]}, ${0.15 + breathPhase * 0.05})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, w);

      // ── Draw body pixels ──
      const cs = cellSize * dpr;
      for (const [key, rgba] of body) {
        const [cx, cy] = key.split(",").map(Number);
        ctx.fillStyle = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3] / 255})`;
        ctx.fillRect(Math.round(cx * cs), Math.round(cy * cs), Math.ceil(cs), Math.ceil(cs));
      }

      // ── Highlight pixels (top edge lighter) ──
      for (const [key] of body) {
        const [cx, cy] = key.split(",").map(Number);
        const above = body.has(`${cx},${cy - 1}`);
        if (!above) {
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(Math.round(cx * cs), Math.round(cy * cs), Math.ceil(cs), Math.ceil(cs));
        }
      }

      // ── Shadow pixels (bottom edge darker) ──
      for (const [key] of body) {
        const [cx, cy] = key.split(",").map(Number);
        const below = body.has(`${cx},${cy + 1}`);
        if (!below) {
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(Math.round(cx * cs), Math.round(cy * cs), Math.ceil(cs), Math.ceil(cs));
        }
      }

      // ── Eyes ──
      const eyeY = bodyStartY + template.eyeY;
      const leftEyeX = template.eyeInner;
      const rightEyeX = cells - 1 - template.eyeInner;
      const isBlink = state === "blink";

      drawEye(ctx, leftEyeX, eyeY, cs, isBlink ? "blink" : expression, primaryRgb);
      drawEye(ctx, rightEyeX, eyeY, cs, isBlink ? "blink" : expression, primaryRgb);

      // ── Mouth (only for some expressions) ──
      const mouthY = eyeY + 2;
      if (expression === "happy" || state === "bounce") {
        // Smile: 2-pixel curve
        ctx.fillStyle = `rgba(${primaryRgb[0] * 0.3}, ${primaryRgb[1] * 0.3}, ${primaryRgb[2] * 0.3}, 0.8)`;
        ctx.fillRect(Math.round((mid - 1) * cs), Math.round(mouthY * cs), Math.ceil(cs), Math.ceil(cs));
        ctx.fillRect(Math.round(mid * cs), Math.round(mouthY * cs), Math.ceil(cs), Math.ceil(cs));
        ctx.fillRect(Math.round((mid - 2) * cs), Math.round((mouthY - 1) * cs), Math.ceil(cs), Math.ceil(cs));
        ctx.fillRect(Math.round((mid + 1) * cs), Math.round((mouthY - 1) * cs), Math.ceil(cs), Math.ceil(cs));
      } else if (expression === "surprised") {
        // O mouth
        ctx.fillStyle = `rgba(${primaryRgb[0] * 0.2}, ${primaryRgb[1] * 0.2}, ${primaryRgb[2] * 0.2}, 0.9)`;
        ctx.fillRect(Math.round((mid - 0.5) * cs), Math.round(mouthY * cs), Math.ceil(cs), Math.ceil(cs * 1.3));
      }

      // ── Floating particles ──
      const particleCount = Math.min(Math.round(appearance.visual.particles / 12), 4);
      for (let i = 0; i < particleCount; i++) {
        const px2 = ((i * 37 + frame * 0.7) % (cells * 3)) - cells * 0.5;
        const py = ((i * 53 + frame * 0.4) % (cells * 2)) - cells * 0.2;
        const alpha = 0.3 + Math.sin(frame * 0.05 + i) * 0.2;
        if (alpha > 0 && px2 > 0 && px2 < cells && py > 0 && py < cells) {
          ctx.fillStyle = `rgba(${ringRgb[0]}, ${ringRgb[1]}, ${ringRgb[2]}, ${alpha})`;
          ctx.fillRect(Math.round(px2 * cs), Math.round(py * cs), Math.ceil(cs * 0.7), Math.ceil(cs * 0.7));
        }
      }

      ctx.restore();

      // ── Low vitality overlay ──
      if (appearance.vitality < 0.3) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, w, w);
      }
    },
    [appearance.vitality, appearance.visual.particles, bodyPixels, cellSize, cells, dpr, expression, primaryRgb, px, ringRgb, template],
  );

  // ── Animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let lastTime = 0;
    const FPS = 12; // pixel art looks best at low fps
    const interval = 1000 / FPS;

    function tick(time: number) {
      if (!running) return;
      animRef.current = requestAnimationFrame(tick);

      if (time - lastTime < interval) return;
      lastTime = time;
      frameRef.current += 1;
      const frame = frameRef.current;

      // ── State machine ──
      if (stateRef.current === "blink") {
        if (frame - blinkTimerRef.current > 2) {
          stateRef.current = "idle";
        }
      } else if (stateRef.current === "bounce") {
        if (frame - blinkTimerRef.current > 6) {
          stateRef.current = "idle";
        }
      } else if (stateRef.current === "squish") {
        if (frame - blinkTimerRef.current > 3) {
          stateRef.current = "bounce";
          blinkTimerRef.current = frame;
        }
      } else {
        // Random blink every ~3-6 seconds at 12fps
        if (Math.random() < 0.008) {
          stateRef.current = "blink";
          blinkTimerRef.current = frame;
        }
      }

      draw(ctx!, frame);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // ── Touch / click interaction ──
  const handleInteract = useCallback(() => {
    stateRef.current = "squish";
    blinkTimerRef.current = frameRef.current;
    touchedRef.current = true;
    setTick((t) => t + 1);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={px * dpr}
      height={px * dpr}
      onClick={handleInteract}
      onTouchStart={handleInteract}
      className="shrink-0 cursor-pointer"
      style={{
        width: px,
        height: px,
        imageRendering: "pixelated",
      }}
    />
  );
}

// ── Draw a single eye ──
function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cs: number,
  expr: EyeExpression | "blink",
  primaryRgb: [number, number, number],
) {
  const px = Math.round(x * cs);
  const py = Math.round(y * cs);
  const s = Math.ceil(cs);

  switch (expr) {
    case "blink":
      // Horizontal line
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(px, py + Math.round(s * 0.4), s, Math.ceil(s * 0.2));
      break;
    case "happy":
      // Upside-down arc (^_^)
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(px, py, s, Math.ceil(s * 0.3));
      ctx.fillRect(px - Math.round(s * 0.15), py + Math.round(s * 0.2), Math.ceil(s * 0.3), Math.ceil(s * 0.3));
      ctx.fillRect(px + Math.round(s * 0.85), py + Math.round(s * 0.2), Math.ceil(s * 0.3), Math.ceil(s * 0.3));
      break;
    case "sleepy":
      // Half-closed
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(px, py + Math.round(s * 0.3), s, Math.ceil(s * 0.5));
      break;
    case "surprised":
      // Big round eye
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(px - Math.round(s * 0.1), py - Math.round(s * 0.1), Math.ceil(s * 1.2), Math.ceil(s * 1.2));
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(px + Math.round(s * 0.15), py + Math.round(s * 0.15), Math.ceil(s * 0.7), Math.ceil(s * 0.7));
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(px + Math.round(s * 0.55), py + Math.round(s * 0.1), Math.ceil(s * 0.25), Math.ceil(s * 0.25));
      break;
    case "angry":
      // Slanted
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(px, py + Math.round(s * 0.1), s, Math.ceil(s * 0.6));
      // Angry eyebrow
      ctx.fillStyle = `rgba(${primaryRgb[0] * 0.4}, ${primaryRgb[1] * 0.4}, ${primaryRgb[2] * 0.4}, 0.8)`;
      ctx.fillRect(px - Math.round(s * 0.1), py - Math.round(s * 0.2), Math.ceil(s * 1.2), Math.ceil(s * 0.25));
      break;
    default: // open
      // White with pupil
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      const pupilSize = Math.ceil(s * 0.55);
      ctx.fillRect(px + Math.round((s - pupilSize) * 0.55), py + Math.round((s - pupilSize) * 0.45), pupilSize, pupilSize);
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(px + Math.round(s * 0.6), py + Math.round(s * 0.1), Math.ceil(s * 0.25), Math.ceil(s * 0.25));
      break;
  }
}

/**
 * Alive Math — organic pulse calculations for biological breathing.
 * Produces frame-by-frame size modulation that makes the creature feel alive:
 *   breath (2 Hz sin) + organic jitter (3.5 Hz cos) + active distortion (noise).
 *
 * Usage: replace static radius with calculateAliveForm(time, baseRadius, volatility).
 */

export const calculateAliveForm = (
  time: number,
  baseSize: number,
  volatility: number,
): number => {
  const breath = Math.sin(time * 2) * (baseSize * 0.08);
  const organicJitter = Math.cos(time * 3.5) * (baseSize * 0.02);
  // Deterministic noise substitute — avoids Math.random() to keep consistent per-frame
  const phase = Math.sin(time * 7.3) * Math.cos(time * 11.1);
  const activeDistortion = phase * volatility * 5;
  return baseSize + breath + organicJitter + activeDistortion;
};

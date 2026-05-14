export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function clamp01(value: number) {
  return clamp(value, 0, 1);
}

// Frame-rate-independent easing helpers.
// Replaces maath/easing damp/damp3 whose scalar API changed in v0.10.

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

interface Vec3Like { x: number; y: number; z: number }

export function damp3(
  v: Vec3Like,
  target: Vec3Like | [number, number, number],
  lambda: number,
  dt: number,
): void {
  const f = 1 - Math.exp(-lambda * dt);
  const tx = Array.isArray(target) ? target[0] : target.x;
  const ty = Array.isArray(target) ? target[1] : target.y;
  const tz = Array.isArray(target) ? target[2] : target.z;
  v.x += (tx - v.x) * f;
  v.y += (ty - v.y) * f;
  v.z += (tz - v.z) * f;
}

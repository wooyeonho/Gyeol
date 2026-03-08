const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const store = new Map<string, number[]>();

function prune(key: string, now: number): void {
  const times = store.get(key) ?? [];
  const valid = times.filter((t) => now - t < WINDOW_MS);
  if (valid.length === 0) store.delete(key);
  else store.set(key, valid);
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  prune(key, now);
  const times = store.get(key) ?? [];
  if (times.length >= MAX_PER_WINDOW) return false;
  times.push(now);
  store.set(key, times);
  return true;
}

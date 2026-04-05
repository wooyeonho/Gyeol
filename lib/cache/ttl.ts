type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const CACHE = new Map<string, CacheEntry<unknown>>();

// Periodic sweep to evict expired entries and prevent memory leak on warm instances
const _sweepInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of CACHE) {
    if (entry.expiresAt <= now) CACHE.delete(key);
  }
}, 60_000); // every 60 seconds
if (typeof _sweepInterval === "object" && "unref" in _sweepInterval) {
  (_sweepInterval as { unref: () => void }).unref();
}

export function getTtlCache<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setTtlCache<T>(key: string, value: T, ttlMs: number) {
  CACHE.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearTtlCache(key: string) {
  CACHE.delete(key);
}

export function clearTtlCacheByPrefix(prefix: string) {
  for (const key of CACHE.keys()) {
    if (key.startsWith(prefix)) {
      CACHE.delete(key);
    }
  }
}

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const CACHE = new Map<string, CacheEntry<unknown>>();

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

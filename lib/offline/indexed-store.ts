/**
 * IndexedDB Store — persistent offline storage layer.
 *
 * Wraps IndexedDB with a simple key-value interface for offline data caching.
 */

const DB_NAME = "gyeol_offline";
const DB_VERSION = 1;
const STORE_NAME = "cache";

export interface CachedRecord {
  key: string;
  data: unknown;
  updatedAt: number;
  expiresAt: number | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store a value in IndexedDB.
 */
export async function setItem(key: string, data: unknown, ttlMs?: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: CachedRecord = {
      key,
      data,
      updatedAt: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    };
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get a value from IndexedDB (returns null if expired or missing).
 */
export async function getItem<T = unknown>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      const record = request.result as CachedRecord | undefined;
      if (!record) {
        resolve(null);
        return;
      }
      if (record.expiresAt && record.expiresAt < Date.now()) {
        // Expired — clean up asynchronously
        deleteItem(key).catch(() => {});
        resolve(null);
        return;
      }
      resolve(record.data as T);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a value from IndexedDB.
 */
export async function deleteItem(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all cached keys.
 */
export async function getAllKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear expired entries.
 */
export async function pruneExpired(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("expiresAt");
    const now = Date.now();
    let pruned = 0;

    const cursor = index.openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (!c) {
        resolve(pruned);
        return;
      }
      const record = c.value as CachedRecord;
      if (record.expiresAt && record.expiresAt < now) {
        c.delete();
        pruned++;
      }
      c.continue();
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

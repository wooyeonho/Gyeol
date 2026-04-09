/**
 * Offline action queue — queues API calls when offline, replays via Background Sync.
 * Inspired by Notion/Toss offline-first architecture.
 */

interface PendingAction {
  id?: number;
  url: string;
  method: string;
  body?: unknown;
  timestamp: string;
}

const DB_NAME = "gyeol-offline";
const STORE_NAME = "pending-actions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Queue an action for background sync when offline */
export async function queueOfflineAction(action: Omit<PendingAction, "id" | "timestamp">): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.add({ ...action, timestamp: new Date().toISOString() });

  // Request background sync
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-pending-actions");
  }
}

/** Get count of pending offline actions */
export async function getPendingActionCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}

/**
 * Fetch with offline fallback — tries network first, queues to IndexedDB if offline.
 * For mutating requests (POST/PUT/DELETE) only.
 */
export async function fetchWithOfflineFallback(
  url: string,
  options: RequestInit & { offlineBody?: unknown } = {},
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    // Network error — queue for background sync
    if (options.method && options.method !== "GET") {
      await queueOfflineAction({
        url,
        method: options.method,
        body: options.offlineBody ?? (options.body ? JSON.parse(options.body as string) : undefined),
      });
    }
    throw err;
  }
}

/** Check if we're currently online */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

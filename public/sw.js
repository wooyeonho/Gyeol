/* ── Offline cache strategy ── */
const CACHE_NAME = "gyeol-v2";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = ["/", "/offline", "/icons/gyeol.svg", "/manifest.json"];
const STATIC_CACHE = "gyeol-static-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r || caches.match("/")))
    );
    return;
  }
  // Skip API routes — let them go directly to network
  if (event.request.url.includes("/api/")) return;

  // Stale-while-revalidate for static assets (_next/static, images, fonts)
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/_next/static") || /\.(woff2?|ttf|otf|png|jpg|svg|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Default: cache-first for other requests
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

/* ── IndexedDB helpers for offline action queue ── */
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("gyeol-offline", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("pending-actions")) {
        db.createObjectStore("pending-actions", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingActions() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending-actions", "readonly");
    const store = tx.objectStore("pending-actions");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearPendingAction(id) {
  const db = await openOfflineDB();
  const tx = db.transaction("pending-actions", "readwrite");
  tx.objectStore("pending-actions").delete(id);
}

/* ── Background sync for offline actions ── */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-actions") {
    event.waitUntil(
      getPendingActions().then(async (actions) => {
        for (const action of actions) {
          try {
            const res = await fetch(action.url, {
              method: action.method || "POST",
              headers: { "Content-Type": "application/json" },
              body: action.body ? JSON.stringify(action.body) : undefined,
            });
            if (res.ok) await clearPendingAction(action.id);
          } catch {
            // Will retry on next sync
          }
        }
      })
    );
  }
});

/* ── Push notifications ── */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const title = data.title || "Gyeol";
    const options = {
      body: data.body,
      icon: "/icon-192x192.png", // Assuming this exists or falls back gracefully
      badge: "/badge-72x72.png", // Optional badge
      data: data.data || {},
      vibrate: [200, 100, 200]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Gyeol", {
        body: text,
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

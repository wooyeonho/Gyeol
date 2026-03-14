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
  } catch (err) {
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

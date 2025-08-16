// sw.js - Service Worker for push notifications
self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "FridgeMind";
  const options = {
    body: data.body || "You have a fridge reminder!",
    icon: "https://i.imgur.com/8QfU5Yq.png",
    badge: "https://i.imgur.com/8QfU5Yq.png"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});

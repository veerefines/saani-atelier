/* Saani's Atelier: shows "something new arrived" notifications and opens the right page on tap. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Saani’s Atelier';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Something new is waiting for you.',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/favicon-48.png',
      data: { url: data.url || '/home' },
      tag: data.url || 'atelier',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/home', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

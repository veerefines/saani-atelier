/* Saani's Atelier service worker:
 * - notifications ("something new arrived"), opening the right page on tap
 * - offline: pages she's opened, the site's code and images, and photos/voice notes she's seen,
 *   so the guide, letters and wall still open in the metro.
 */

const VERSION = 'atelier-v3';
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const MEDIA = `${VERSION}-media`;
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE, '/icons/icon-192.png', '/reveal/paper.webp']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

const isStatic = (p) => p.startsWith('/_next/static/') || p.startsWith('/icons/') || p.startsWith('/reveal/') || p.startsWith('/journey/') || p.startsWith('/her/') || /\.(woff2?|webp|png|jpg|svg)$/.test(p);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return; // video/audio seeking goes straight to the network
  const p = url.pathname;

  // pages: fresh when online, the last copy when not
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy).then(() => trim(PAGES, 40)));
          }
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match(OFFLINE))),
    );
    return;
  }

  // code, styles, fonts and site images never change under the same name
  if (isStatic(p)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === 'basic') {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // her photos and voice notes (ids never change): keep the ones she's seen.
  // In production these redirect to Supabase; fetching with CORS keeps the bytes cacheable.
  if (p.startsWith('/api/media/') && (req.destination === 'image' || req.destination === 'audio')) {
    event.respondWith(
      caches.open(MEDIA).then(async (c) => {
        const hit = await c.match(req.url);
        if (hit) return hit;
        try {
          const res = await fetch(req.url, { mode: 'cors', credentials: 'same-origin', redirect: 'follow' });
          if (res.ok) {
            c.put(req.url, res.clone()).then(() => trim(MEDIA, 150));
            return res;
          }
          return fetch(req);
        } catch {
          return fetch(req);
        }
      }),
    );
  }
  // everything else (the API, live data) is network-only
});

/* ---------- notifications ---------- */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Saani’s Atelier';
  event.waitUntil(
    self.registration
      .showNotification(title, {
        body: data.body || 'Something new is waiting for you.',
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/favicon-48.png',
        data: { url: data.url || '/home' },
        // each one stays (two friends' nudges shouldn't replace each other) unless the server groups them
        tag: data.tag || `atelier-${Date.now()}`,
        renotify: true,
      })
      .then(updateBadge),
  );
});

/** The home-screen icon shows how many notifications are waiting (where the device supports it). */
function updateBadge() {
  if (!self.navigator.setAppBadge) return;
  return self.registration.getNotifications().then((n) => (n.length ? self.navigator.setAppBadge(n.length) : self.navigator.clearAppBadge())).catch(() => {});
}
self.addEventListener('notificationclose', (event) => event.waitUntil(updateBadge()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  updateBadge();
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

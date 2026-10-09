// Reading Rocket service worker: lets the app open with no internet.
const SHELL = 'rr-shell-v10';
const MEDIA = 'rr-media-v1';
const FILES = ['./', 'index.html', 'animals.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Book searches always go to the internet.
  if (url.pathname.endsWith('search.json') || url.hostname === 'www.googleapis.com') return;

  // The app itself: always get the newest version; use the saved copy only when offline.
  if (url.origin === location.origin) {
    e.respondWith(caches.open(SHELL).then(c =>
      fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })
        .catch(() => c.match(req, { ignoreSearch: true }))
    ));
    return;
  }

  // Book covers and fonts: keep a copy so they show offline.
  if (/covers\.openlibrary\.org|archive\.org|books\.google|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(caches.open(MEDIA).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
});

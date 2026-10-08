// app-shell cache so the app opens instantly and offline. books live in IndexedDB, untouched here.
// shell files come from cache and refresh in the background (stale-while-revalidate), so a new deploy
// shows up on the second load with no version bump needed.
const CACHE = 'reader-shell-v4';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg', './icon-192.png'].map(s => new URL(s, self.location).href);
// only these hosts are cached at runtime (pinned library versions + fonts). github api responses are never cached.
const CDN = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isShell = SHELL.includes(url.origin + url.pathname) || req.mode === 'navigate';
  if (isShell) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match(SHELL[1]) : null);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
  // everything else (github api, etc.) goes straight to the network
});

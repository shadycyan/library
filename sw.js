// app-shell cache only — book files live in IndexedDB, untouched here.
// bump CACHE on every deploy so clients pick up the new reader.html.
const CACHE = 'reader-shell-v1';
const SHELL = ['./reader.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// shell files: cache-first so the app opens instantly offline.
// everything else (cdn libs, fonts, github api): network, falling back to cache if offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isShell = SHELL.some(s => e.request.url.endsWith(s.replace('./', '')));
  if (isShell) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  } else {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});

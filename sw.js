const CACHE_NAME = 'notas-voz-v7';
const ASSETS = [
  '/voice-notes-app/',
  '/voice-notes-app/index.html',
  '/voice-notes-app/manifest.json',
  '/voice-notes-app/css/styles.css',
  '/voice-notes-app/js/config.js',
  '/voice-notes-app/js/audio.js',
  '/voice-notes-app/js/api-ia.js',
  '/voice-notes-app/js/api-sheets.js',
  '/voice-notes-app/js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
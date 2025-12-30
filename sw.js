const CACHE_NAME = 'anistream-v1';
const ASSETS = [
  './',              // <-- ADD DOT
  './index.html',    // <-- ADD DOT
  './watch.html',    // <-- ADD DOT
  './style.css',     // <-- ADD DOT
  './script.js',     // <-- ADD DOT
  './manifest.json', // <-- ADD DOT
  './logo.png'       // <-- ADD DOT
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch Event (Offline Support)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
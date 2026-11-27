const CACHE_NAME = 'king-shryan-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './catalog.json',
  './css/main.css',
  './css/player.css',
  './css/themes.css',
  './js/app.js'
];

// تثبيت وتحميل الملفات
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// تفعيل ومسح الكاش القديم
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// جلب الملفات
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

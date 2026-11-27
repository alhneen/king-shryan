const CACHE_NAME = 'king-shryan-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './catalog.json',
  './css/main.css',
  './css/player.css',
  './css/themes.css',
  './js/app.js',
  './js/config.js'
];

// تخزين الملفات أول ما التطبيق يتثبت
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// تفعيل وتحديث الكاش
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// جلب الملفات من الكاش لو النت فصل
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

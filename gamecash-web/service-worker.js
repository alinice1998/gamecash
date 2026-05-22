const CACHE_NAME = 'gamecash-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './mobile.html',
  './css/style.css',
  './css/mobile.css',
  './js/api.js',
  './js/app.js',
  './js/mobile.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './js/lib/sweetalert2.all.min.js',
  './js/lib/chart.min.js'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App Shell Assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event (Cleanup Old Caches)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing Old Cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip caching API requests or non-GET requests
  if (e.request.method !== 'GET' || url.search.includes('route=api/') || url.pathname.includes('/gamecash-backend/')) {
    // Let network handle all API queries directly
    return;
  }

  // Network First, falling back to cache if offline
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If successful response, clone and cache it for static assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If offline, retrieve from cache
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache, let it fail gracefully
        });
      })
  );
});

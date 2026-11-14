const CACHE_NAME = 'clarify-cache-v1.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  '/assets/icon.svg',
  '/assets/CSDA_Clarify_Guide.pdf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // We only want to cache local static assets, not API routes or WebRTC endpoints.
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found, else fetch over network
        return response || fetch(event.request);
      })
  );
});

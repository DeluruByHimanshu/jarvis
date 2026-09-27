// JARVIS Multi-Agent Command Core - Cache Buster & Offline Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

// Bypass dev server modules completely
self.addEventListener('fetch', (event) => {
  // Never intercept dev modules, vite dependencies or scripts
  const url = event.request.url;
  if (
    url.includes('/node_modules/') ||
    url.includes('/@vite/') ||
    url.includes('/src/') ||
    url.includes('?v=') ||
    url.includes('/api/')
  ) {
    return;
  }
});

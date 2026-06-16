import { manifest, version } from '@parcel/service-worker';

const swContext = self;

const CACHE_NAME = `static-cache-${version}`;

// install handler
swContext.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(manifest);
      swContext.skipWaiting();
    })()
  );
});

// activate handler
swContext.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cache) => {
          if(cache !== CACHE_NAME){
            return caches.delete(cache);
          }
        })
      );

      await swContext.clients.claim();
    })()
  );
});

// fetch handler
swContext.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  if(url.pathname.endsWith('.ipynb') || url.pathname.endsWith('.json')){
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if(cachedResponse) return cachedResponse;

      if(event.request.mode === 'navigate'){
        const indexURL = new URL('./index.html', swContext.location.href);
        const indexHTML = await caches.match(indexURL);
        if(indexHTML) return indexHTML;
      }

      return fetch(event.request);
    })()
  );
});
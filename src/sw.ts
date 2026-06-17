import {manifest, version} from '@parcel/service-worker';

declare const self: ServiceWorkerGlobalScope;
export {};

const toCache = [...manifest, '/notebook/'];
const CACHE_NAME = `static-cache-${version}`;

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => cache.addAll(toCache))
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if(cache !== CACHE_NAME){
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const request = event.request;

  if(request.method !== "GET" || 
    !request.url.startsWith(self.location.origin) || 
    request.url.startsWith('ws')
  ){
    return;
  }

  event.respondWith(
    caches.match(request, {ignoreSearch: true}).then(async cachedResponse => {
      if(cachedResponse) return cachedResponse;

      try{
        const networkResponse = await fetch(request);

        if(networkResponse.status === 200){
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      }catch(error){
        if(request.mode === 'navigate'){
          const rootResponse = await caches.match('/');
          if(rootResponse) return rootResponse;

          const indexResponse = await caches.match('/index.html');
          if(indexResponse) return indexResponse;

          const notebookResponse = await caches.match('/notebook/');
          if(notebookResponse) return notebookResponse;
        }

        throw error;
      }
    })
  );
});
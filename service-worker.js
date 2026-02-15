/* ================= CONFIG ================= */

const CACHE_NAME = "lista-compras-v3";

/* ================= INSTALL ================= */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

/* ================= ACTIVATE ================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

/* ================= FETCH ================= */

self.addEventListener("fetch", (event) => {

  if (event.request.method !== "GET") return;

  event.respondWith(

    fetch(event.request)
      .then((networkResponse) => {

        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;

      })
      .catch(() => {
        return caches.match(event.request);
      })

  );
});

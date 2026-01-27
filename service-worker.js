self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("lista-compras-v1").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js"
      ]);
    })
  );
});

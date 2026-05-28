const CACHE_NAME = "flux-v53";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only pre-cache static assets — NOT HTML or JS bundles
      return cache.addAll(["/manifest.json"]);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  // Never cache JS/CSS assets — always fetch fresh
  if (event.request.url.includes("/assets/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for HTML — ensures fresh JS bundle references after every deploy
  const url = new URL(event.request.url);
  if (url.pathname === "/" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (manifest, icons, etc.)
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      })
    )
  );
});

const CACHE_NAME = "flux-v61";
const OFFLINE_URL = "/index.html";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/", "/index.html", "/manifest.json"]);
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
  // Skip non-GET and non-HTTP requests
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  // JS/CSS assets — network first, cache fallback, never crash
  if (event.request.url.includes("/assets/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Return empty JS to prevent crash
            return new Response("", {
              headers: { "Content-Type": "application/javascript" },
            });
          });
        })
    );
    return;
  }

  // HTML — network first, cached fallback, never crash
  if (
    event.request.headers.get("accept")?.includes("text/html") ||
    event.request.url.endsWith("/")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => {
          return caches.match(OFFLINE_URL).then((cached) => {
            return cached || caches.match("/index.html");
          });
        })
    );
    return;
  }

  // External requests (fonts, APIs) — try network, fail silently
  if (!event.request.url.includes(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response("", { status: 503 });
      })
    );
    return;
  }

  // Everything else — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => {
          return new Response("", { status: 503 });
        });
    })
  );
});
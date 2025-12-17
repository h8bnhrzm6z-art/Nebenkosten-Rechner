/* Nebenkostenrechner PWA Service Worker */
const CACHE_NAME = "nebenkosten-pwa-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];
const CDN_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Same-origin assets
    await cache.addAll(SHELL);

    // Cross-origin assets (opaque)
    await Promise.all(CDN_ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { mode: "no-cors" });
        await cache.put(url, res);
      } catch (e) {}
    }));

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const isNav = req.mode === "navigate";
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (isNav) {
      try {
        const fresh = await fetch(req);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cachedShell = await cache.match("./index.html");
        return cachedShell || new Response("Offline", { status: 503 });
      }
    }

    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      if (res && (res.status === 200 || res.type === "opaque")) {
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return new Response("Offline", { status: 503 });
    }
  })());
});

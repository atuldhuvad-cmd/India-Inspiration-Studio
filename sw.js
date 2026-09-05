const CACHE = "daily-inspiration-v2-3-2-independent-pwa-v1";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./data/content.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./artwork/BuiltIn/theme-kindness.jpg",
  "./artwork/BuiltIn/theme-wisdom.jpg",
  "./artwork/BuiltIn/theme-courage.jpg",
  "./artwork/BuiltIn/theme-festival.jpg"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("daily-inspiration-v2-3-2-independent-pwa-") && k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.mode === "navigate" || e.request.url.includes("index.html") || e.request.url.includes("sw.js")) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

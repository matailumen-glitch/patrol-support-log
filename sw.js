const CACHE_NAME = "patrol-support-log-v153";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css?v=153",
  "./script.js?v=153",
  "./route-config.js?v=153",
  "./storage.js?v=153",
  "./manifest.json?v=153",
  "./icon.svg?v=153"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match("./index.html") || caches.match("./")
        )
      )
  );
});

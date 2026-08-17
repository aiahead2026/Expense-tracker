// Minimal service worker: caches the app shell so the tracker still opens
// (with cached UI) if the phone is briefly offline. Live expense data still
// requires a network connection to Supabase.

const CACHE_NAME = "expense-tracker-shell-v1";
const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle same-origin GET requests for the app shell (index.html, icons, manifest).
  // Everything else — Supabase API calls, CDN scripts — is left completely untouched
  // so the service worker can never be a factor in database read/write reliability,
  // including intermittent "Load failed" errors seen on mobile Safari.
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return; // not calling respondWith() means the browser handles this request normally
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
      );
    })
  );
});

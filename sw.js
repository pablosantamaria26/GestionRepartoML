const CACHE_NAME = 'reparto-ml-v14';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@600&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Nunca interceptar: Firebase, GAS, Cloudflare Worker, non-GET
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('script.google.com') ||
      url.hostname.includes('workers.dev') ||
      url.hostname.includes('identitytoolkit') ||
      url.hostname.includes('securetoken') ||
      event.request.method !== 'GET') {
    return;
  }

  // index.html y navegación: network-first — siempre fresco cuando hay internet
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match('./index.html').then(cached => cached || caches.match('./')).then(cached =>
          cached || new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<body style="font-family:sans-serif;background:#0f1220;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px">' +
            '<div><h2>📴 Sin señal</h2><p>No se pudo cargar la app. Volvé a intentar cuando tengas conexión.</p>' +
            '<button onclick="location.reload()" style="padding:12px 24px;border-radius:8px;border:none;background:#4f7cff;color:#fff;font-size:1rem">Reintentar</button></div>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        ))
    );
    return;
  }

  // Assets estáticos (Firebase SDK, fuentes, íconos): cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});

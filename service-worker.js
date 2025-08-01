const CACHE_NAME = 'chinchon_v9'; // Actualiza este valor para invalidar la caché antigua

const FILES_TO_CACHE = [
  './',
  './index.html',
  './fondo.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 👈 fuerza activación inmediata

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/', // o '/index.html' si usas rutas relativas
        '/index.html',
        '/main.js',
        '/style.css',
        '/icon.png', // lo que sea que uses
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // 🔥 elimina caches antiguos
          }
        })
      )
    ).then(() => self.clients.claim()) // 👈 controla inmediatamente
  );
});


// Interceptar todas las peticiones
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Devuelve desde caché
        return response;
      }

      // Intenta obtener desde red y luego guarda en caché
      return fetch(event.request)
        .then((networkResponse) => {
          // Solo cachear si es una respuesta válida (p. ej., no errores 404)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clonar la respuesta antes de cachearla
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((error) => {
          console.warn('[SW] Error al hacer fetch:', error);
          // Aquí puedes devolver una página offline o imagen de fallback si quieres
          return new Response('🔌 Sin conexión y recurso no disponible.', {
            status: 503,
            statusText: 'Offline'
          });
        });
    })
  );
});

// Permite que el SW se actualice inmediatamente si se llama desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING recibido, activando nuevo SW.');
    self.skipWaiting();
  }
});

const CACHE_NAME = 'chinchon_v5'; // Actualiza este valor para invalidar la caché antigua

const FILES_TO_CACHE = [
  './',
  './index.html',
  './fondo.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación del Service Worker: se cachean los archivos definidos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caché creada:', CACHE_NAME);
      return cache.addAll(FILES_TO_CACHE);
    }).catch((error) => {
      console.error('[SW] Error al cachear archivos:', error);
    })
  );
  self.skipWaiting(); // Permite que el nuevo SW tome control inmediatamente
});

// Activación: elimina versiones anteriores del caché
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando nuevo service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Borrando caché antiguo:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Toma el control de todas las páginas
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

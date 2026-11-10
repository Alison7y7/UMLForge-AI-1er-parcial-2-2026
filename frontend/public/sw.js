/* UMLForge AI - Service Worker (Fase 1: Base PWA e Instalabilidad) */
const CACHE_NAME = 'umlforge-static-v1.0.4';

// Recursos estáticos mínimos requeridos para arrancar el App Shell
const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// 1. INSTALACIÓN (Skip waiting inmediato para activar cambios de CU16)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Aviso precache inicial:', err);
      });
    })
  );
});

// 2. ACTIVACIÓN Y LIMPIEZA DE CACHÉS OBSOLETAS
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Eliminando caché obsoleta:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. MENSAJES ENTRE CLIENTE Y SERVICE WORKER (Para control de actualizaciones)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. INTERCEPTOR FETCH CON POLÍTICA ESTRICTA DE SEGURIDAD
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // REGLA 1: Solo interceptar métodos GET seguros
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // REGLA 2: SEGURIDAD ESTRICTA - NUNCA INTERCEPTAR:
  // - Endpoints REST privados del backend (/api/)
  // - WebSocket / STOMP / SockJS (/ws-uml, /ws/)
  // - Solicitudes de autenticación o tokens
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.includes('sockjs')
  ) {
    return; // Pasa directo al backend sin pasar por caché
  }

  // REGLA 3: Navegación de rutas SPA (ej: /login, /dashboard, /proyectos)
  // Estrategia: Network First, fallback a /index.html en caso de no conexión
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la respuesta es válida, la devolvemos
          if (response && response.status === 200) {
            return response;
          }
          return caches.match('/index.html') || response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // REGLA 4: Recursos estáticos (scripts, estilos, fuentes, imágenes locales)
  // Estrategia: Stale-While-Revalidate para recursos estáticos del app shell
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// CU23: el payload procede exclusivamente del backend autenticado y firmado con VAPID.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }
  const title = String(data.title || 'UMLForge AI').slice(0, 80);
  const body = String(data.body || 'Tienes una nueva actividad.').slice(0, 180);
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
    ? data.url : '/dashboard';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: String(data.tag || 'umlforge').slice(0, 100),
    renotify: false,
    data: { url }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const relativeUrl = event.notification.data?.url || '/dashboard';
  const target = new URL(relativeUrl, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if ('focus' in client) {
        client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
  }));
});

/**
 * Registro y gestión del ciclo de vida del Service Worker para UMLForge AI
 */

type UpdateCallback = (registration: ServiceWorkerRegistration) => void;

let updateCallback: UpdateCallback | null = null;
let waitingWorker: ServiceWorker | null = null;

export function onServiceWorkerUpdate(callback: UpdateCallback) {
  updateCallback = callback;
}

export function applyServiceWorkerUpdate() {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Permitir localhost o HTTPS (estándar PWA)
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );

  if (window.location.protocol !== 'https:' && !isLocalhost) {
    console.warn('[PWA] El Service Worker requiere HTTPS en entornos remotos.');
    // Aún intentamos registrar por si se usa en red local configurada
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado exitosamente con scope:', registration.scope);

        // Forzar verificación de nueva versión en el servidor
        registration.update().catch(() => {});

        // 1. Si ya hay un worker esperando activación
        if (registration.waiting) {
          waitingWorker = registration.waiting;
          if (updateCallback) updateCallback(registration);
        }

        // 2. Si se detecta un nuevo worker instalándose
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Hay un nuevo contenido disponible
                console.log('[PWA] Nueva versión disponible');
                waitingWorker = registration.waiting || installingWorker;
                if (updateCallback) updateCallback(registration);
              } else {
                // Contenido almacenado en caché por primera vez
                console.log('[PWA] Contenido listo para uso offline inicial');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] Error registrando Service Worker:', error);
      });

    // 3. Cuando el nuevo Service Worker toma el control, recargar la página
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

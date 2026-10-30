// Service Worker para Notificaciones Push Web - Ingenio CRM
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || '🚨 ¡Nueva Venta Registrada! 💰';
    const options = {
      body: payload.body || 'Se ha registrado una nueva venta en el CRM.',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      vibrate: payload.vibrate || [200, 100, 200, 100, 300],
      tag: payload.tag || `crm-sale-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: payload.data || { url: '/sales' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Error procesando notificación push:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/sales';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});

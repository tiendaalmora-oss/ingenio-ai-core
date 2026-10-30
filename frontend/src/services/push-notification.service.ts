import api from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribeToWebPush(
  tenantId: string | null,
  role: string | null,
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Este navegador no soporta notificaciones push.' };
  }

  // 1. Pedir permiso explícito al usuario
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      error: 'Permiso de notificaciones denegado en el navegador.',
    };
  }

  try {
    // 2. Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;

    // 3. Obtener la llave pública VAPID desde el backend
    const keyRes = await api.get('/notifications/push/public-key');
    const publicKey = keyRes.data?.publicKey;
    if (!publicKey) {
      throw new Error('No se pudo obtener la llave pública VAPID.');
    }

    // 4. Suscribir al PushManager del navegador
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      throw new Error('Datos de suscripción incompletos devueltos por el navegador.');
    }

    // 5. Detectar tipo de dispositivo
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const deviceName = isMobile ? 'Celular Móvil' : 'Navegador de Escritorio';

    // 6. Enviar la suscripción al backend con el rol y tenantId para el enrutamiento multi-tenant
    await api.post('/notifications/push/subscribe', {
      endpoint,
      p256dh,
      auth,
      tenantId: tenantId || null,
      role: role || 'client',
      device: deviceName,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error suscribiendo a push:', err);
    return { success: false, error: err.message || 'Error desconocido' };
  }
}

export async function unsubscribeFromWebPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return true;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await api
        .post('/notifications/push/unsubscribe', { endpoint: subscription.endpoint })
        .catch(() => {});
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('Error desuscribiendo push:', err);
    return false;
  }
}

export async function triggerTestPush(): Promise<boolean> {
  const sub = await getExistingSubscription();
  if (!sub) return false;
  try {
    await api.post('/notifications/push/test', { endpoint: sub.endpoint });
    return true;
  } catch (err) {
    console.error('Error disparando test push:', err);
    return false;
  }
}

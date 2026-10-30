import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import * as webPush from 'web-push';

export interface SalePushData {
  productName: string;
  customerName?: string;
  amountFormatted: string;
  reference?: string;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  private readonly publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    'BDENVKtzccSUUoHxvIG6KBOmlZMmqURSSufFRvYQyDmBn0QiIR8bSotbOqaqo1Oa3Rht8fnDydNNy8G9NluorHA';

  private readonly privateKey =
    process.env.VAPID_PRIVATE_KEY ||
    'OlLa5GTO8L0azyDz_n0bor2ehspHW7cNazCs9OjV8XY';

  private readonly subject =
    process.env.VAPID_SUBJECT || 'mailto:soporte@ingeniodigital.shop';

  constructor(private readonly prisma: PrismaService) {
    try {
      webPush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
      this.logger.log('WebPush VAPID inicializado con éxito');
    } catch (err: any) {
      this.logger.error('Error inicializando WebPush VAPID:', err.message);
    }
  }

  getPublicKey() {
    return { publicKey: this.publicKey };
  }

  async saveSubscription(data: {
    endpoint: string;
    p256dh: string;
    auth: string;
    tenantId?: string | null;
    role?: string;
    device?: string;
  }) {
    const role = data.role || 'client';
    const tenantId = data.tenantId || null;

    const sub = await (this.prisma as any).pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        tenantId,
        role,
        device: data.device || 'Navegador Web',
      },
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
        tenantId,
        role,
        device: data.device || 'Navegador Web',
      },
    });

    this.logger.log(
      `[Push] Dispositivo registrado: role=${role}, tenant=${tenantId || 'GLOBAL'}, id=${sub.id}`,
    );
    return { success: true, id: sub.id };
  }

  async removeSubscription(endpoint: string) {
    try {
      await (this.prisma as any).pushSubscription.delete({
        where: { endpoint },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Enrutamiento Multi-Tenant:
   * 1. A los dueños de cuenta (role: 'client') sólo les llegan las ventas de SU propio tenantId.
   * 2. A los administradores de agencia (role: 'agency_admin', ej: Roberto) les llegan las de TODAS las subcuentas.
   */
  async notifySale(tenantId: string | null | undefined, sale: SalePushData) {
    try {
      // Buscar destinatarios según la política multi-tenant
      const conditions: any[] = [{ role: 'agency_admin' }];
      if (tenantId) {
        conditions.push({ tenantId, role: 'client' });
      }

      const subscriptions = await (this.prisma as any).pushSubscription.findMany({
        where: {
          OR: conditions,
        },
      });

      if (!subscriptions || subscriptions.length === 0) {
        this.logger.debug(
          `[Push] No hay dispositivos suscritos para tenant ${tenantId}`,
        );
        return { sent: 0, failed: 0 };
      }

      const payload = JSON.stringify({
        title: '🚨 ¡Nueva Venta Registrada! 💰',
        body: `${sale.productName} · ${sale.amountFormatted}${sale.customerName ? ` (${sale.customerName})` : ''}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `sale-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 300],
        data: {
          url: '/sales',
          tenantId: tenantId || null,
        },
      });

      let sent = 0;
      let failed = 0;

      for (const sub of subscriptions) {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webPush.sendNotification(pushConfig, payload);
          sent++;
        } catch (err: any) {
          failed++;
          this.logger.warn(
            `[Push] Falló envío a sub ${sub.id} (HTTP ${err.statusCode}): ${err.message}`,
          );
          // Si el navegador ya canceló el registro (410 Gone / 404 Not Found), purgamos la suscripción
          if (err.statusCode === 410 || err.statusCode === 404) {
            await (this.prisma as any).pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          }
        }
      }

      this.logger.log(
        `[Push] Alerta de venta despachada: ${sent} exitosas, ${failed} fallidas para tenant ${tenantId}`,
      );
      return { sent, failed };
    } catch (err: any) {
      this.logger.error('[Push] Error en notifySale:', err.message);
      return { sent: 0, failed: 0, error: err.message };
    }
  }

  async sendTestPush(endpoint: string) {
    const sub = await (this.prisma as any).pushSubscription.findUnique({
      where: { endpoint },
    });
    if (!sub) return { success: false, error: 'Suscripción no encontrada' };

    const payload = JSON.stringify({
      title: '🔔 ¡Prueba de Notificación CRM! 🚀',
      body: 'Tu celular está configurado correctamente para recibir alertas de venta en la barra superior con sonido.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification',
      vibrate: [150, 80, 150],
      data: { url: '/sales' },
    });

    const pushConfig = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    await webPush.sendNotification(pushConfig, payload);
    return { success: true };
  }
}

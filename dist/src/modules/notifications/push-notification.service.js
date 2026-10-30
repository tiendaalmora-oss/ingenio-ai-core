"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PushNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const webPush = __importStar(require("web-push"));
let PushNotificationService = PushNotificationService_1 = class PushNotificationService {
    prisma;
    logger = new common_1.Logger(PushNotificationService_1.name);
    publicKey = process.env.VAPID_PUBLIC_KEY ||
        'BDENVKtzccSUUoHxvIG6KBOmlZMmqURSSufFRvYQyDmBn0QiIR8bSotbOqaqo1Oa3Rht8fnDydNNy8G9NluorHA';
    privateKey = process.env.VAPID_PRIVATE_KEY ||
        'OlLa5GTO8L0azyDz_n0bor2ehspHW7cNazCs9OjV8XY';
    subject = process.env.VAPID_SUBJECT || 'mailto:soporte@ingeniodigital.shop';
    constructor(prisma) {
        this.prisma = prisma;
        try {
            webPush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
            this.logger.log('WebPush VAPID inicializado con éxito');
        }
        catch (err) {
            this.logger.error('Error inicializando WebPush VAPID:', err.message);
        }
    }
    getPublicKey() {
        return { publicKey: this.publicKey };
    }
    async saveSubscription(data) {
        const role = data.role || 'client';
        const tenantId = data.tenantId || null;
        const sub = await this.prisma.pushSubscription.upsert({
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
        this.logger.log(`[Push] Dispositivo registrado: role=${role}, tenant=${tenantId || 'GLOBAL'}, id=${sub.id}`);
        return { success: true, id: sub.id };
    }
    async removeSubscription(endpoint) {
        try {
            await this.prisma.pushSubscription.delete({
                where: { endpoint },
            });
            return { success: true };
        }
        catch {
            return { success: false };
        }
    }
    async notifySale(tenantId, sale) {
        try {
            const conditions = [{ role: 'agency_admin' }];
            if (tenantId) {
                conditions.push({ tenantId, role: 'client' });
            }
            const subscriptions = await this.prisma.pushSubscription.findMany({
                where: {
                    OR: conditions,
                },
            });
            if (!subscriptions || subscriptions.length === 0) {
                this.logger.debug(`[Push] No hay dispositivos suscritos para tenant ${tenantId}`);
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
                }
                catch (err) {
                    failed++;
                    this.logger.warn(`[Push] Falló envío a sub ${sub.id} (HTTP ${err.statusCode}): ${err.message}`);
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await this.prisma.pushSubscription
                            .delete({ where: { id: sub.id } })
                            .catch(() => { });
                    }
                }
            }
            this.logger.log(`[Push] Alerta de venta despachada: ${sent} exitosas, ${failed} fallidas para tenant ${tenantId}`);
            return { sent, failed };
        }
        catch (err) {
            this.logger.error('[Push] Error en notifySale:', err.message);
            return { sent: 0, failed: 0, error: err.message };
        }
    }
    async sendTestPush(endpoint) {
        const sub = await this.prisma.pushSubscription.findUnique({
            where: { endpoint },
        });
        if (!sub)
            return { success: false, error: 'Suscripción no encontrada' };
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
};
exports.PushNotificationService = PushNotificationService;
exports.PushNotificationService = PushNotificationService = PushNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PushNotificationService);
//# sourceMappingURL=push-notification.service.js.map
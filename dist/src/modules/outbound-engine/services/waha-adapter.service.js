"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WahaAdapterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaAdapterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const meta_channel_adapter_service_1 = require("./meta-channel-adapter.service");
let WahaAdapterService = WahaAdapterService_1 = class WahaAdapterService {
    prisma;
    metaChannelAdapter;
    logger = new common_1.Logger(WahaAdapterService_1.name);
    constructor(prisma, metaChannelAdapter) {
        this.prisma = prisma;
        this.metaChannelAdapter = metaChannelAdapter;
    }
    normalizeJid(rawId) {
        if (!rawId)
            return rawId;
        if (rawId.includes('@c.us') || rawId.includes('@g.us') || rawId.includes('@lid')) {
            return rawId;
        }
        const cleaned = rawId.replace(/\D/g, '');
        return `${cleaned}@c.us`;
    }
    async sendMessage(tenantId, contactIdOrPhone, content) {
        let rawPhone = contactIdOrPhone;
        if (rawPhone && (rawPhone.startsWith('ig_') || rawPhone.startsWith('instagram_') || rawPhone.startsWith('fb_') || rawPhone.startsWith('messenger_'))) {
            this.logger.log(`Enrutando mensaje omnicanal hacia Meta (Instagram/FB): ${rawPhone}`);
            return this.metaChannelAdapter.sendMessage(rawPhone, content);
        }
        if (contactIdOrPhone && !contactIdOrPhone.includes('@')) {
            const contact = await this.prisma.contact.findFirst({
                where: {
                    OR: [
                        { id: contactIdOrPhone },
                        { externalId: contactIdOrPhone },
                        { phone: contactIdOrPhone },
                        { phoneNormalized: contactIdOrPhone }
                    ]
                }
            });
            if (contact) {
                rawPhone = contact.externalId || contact.phone || contact.phoneNormalized || contactIdOrPhone;
            }
        }
        let chatId = this.normalizeJid(rawPhone);
        this.logger.log(`Enviando mensaje vía WAHA a ${chatId} (teléfono/ref: ${rawPhone}, id: ${contactIdOrPhone})...`);
        const wahaUrl = process.env.WAHA_API_URL;
        if (!wahaUrl) {
            throw new Error('WAHA_API_URL is not configured');
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        const session = process.env.WAHA_SESSION || tenant?.wahaSession || 'default';
        const apiKey = process.env.WAHA_API_KEY || '';
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (apiKey) {
            headers['X-Api-Key'] = apiKey;
        }
        try {
            let response = await fetch(`${wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    chatId: chatId,
                    text: content,
                    session: session
                })
            });
            let errBody = '';
            if (!response.ok) {
                errBody = await response.text().catch(() => '');
            }
            if (!response.ok && errBody.includes('No LID for user') && chatId.endsWith('@c.us')) {
                const lidChatId = chatId.replace('@c.us', '@lid');
                this.logger.warn(`Detectado error "No LID for user". Reintentando entrega a ${lidChatId}...`);
                chatId = lidChatId;
                response = await fetch(`${wahaUrl}/api/sendText`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        chatId: lidChatId,
                        text: content,
                        session: session
                    })
                });
                if (!response.ok)
                    errBody = await response.text().catch(() => '');
            }
            if (!response.ok && session !== 'default') {
                this.logger.warn(`Envío falló con sesión "${session}". Reintentando con sesión "default"...`);
                response = await fetch(`${wahaUrl}/api/sendText`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        chatId: chatId,
                        text: content,
                        session: 'default'
                    })
                });
                if (!response.ok)
                    errBody = await response.text().catch(() => '');
            }
            if (!response.ok) {
                throw new Error(`Waha response con error ${response.status}: ${response.statusText}. Body: ${errBody}`);
            }
            const result = await response.json();
            this.logger.log(`Mensaje entregado exitosamente a WAHA. MessageId: ${result.id || result.key?.id || 'ok'}`);
            return result.id || result.key?.id || 'waha-msg-ok';
        }
        catch (err) {
            this.logger.error(`Excepción comunicando con WAHA para ${chatId}: ${err.message}`);
            throw err;
        }
    }
    async startTyping(tenantId, contactIdOrPhone) {
        try {
            const wahaUrl = process.env.WAHA_API_URL;
            if (!wahaUrl)
                return;
            const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
            const session = process.env.WAHA_SESSION || tenant?.wahaSession || 'default';
            const apiKey = process.env.WAHA_API_KEY || '';
            const chatId = this.normalizeJid(contactIdOrPhone);
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey)
                headers['X-Api-Key'] = apiKey;
            this.logger.log(`[WAHA] Solicitando estado "Escribiendo..." para ${chatId} (sesión: ${session})`);
            let response = await fetch(`${wahaUrl}/api/startTyping`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ chatId, session }),
                signal: AbortSignal.timeout(4000)
            }).catch((e) => {
                this.logger.warn(`[WAHA] Falló llamada a /api/startTyping: ${e.message}`);
                return null;
            });
            if (!response || !response.ok) {
                response = await fetch(`${wahaUrl}/api/${session}/presence`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ chatId, presence: 'typing' }),
                    signal: AbortSignal.timeout(4000)
                }).catch((e) => {
                    this.logger.warn(`[WAHA] Falló llamada a /api/${session}/presence: ${e.message}`);
                    return null;
                });
            }
            if (response && response.ok) {
                this.logger.log(`[WAHA] Estado "Escribiendo..." activado exitosamente en WhatsApp para ${chatId}`);
            }
            else if (response) {
                const errText = await response.text().catch(() => '');
                this.logger.warn(`[WAHA] WAHA respondió con status ${response.status} en startTyping: ${errText}`);
            }
        }
        catch (err) {
            this.logger.warn(`[WAHA] Excepción no crítica en startTyping: ${err.message}`);
        }
    }
    async stopTyping(tenantId, contactIdOrPhone) {
        try {
            const wahaUrl = process.env.WAHA_API_URL;
            if (!wahaUrl)
                return;
            const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
            const session = process.env.WAHA_SESSION || tenant?.wahaSession || 'default';
            const apiKey = process.env.WAHA_API_KEY || '';
            const chatId = this.normalizeJid(contactIdOrPhone);
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey)
                headers['X-Api-Key'] = apiKey;
            let response = await fetch(`${wahaUrl}/api/stopTyping`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ chatId, session }),
                signal: AbortSignal.timeout(4000)
            }).catch(() => null);
            if (!response || !response.ok) {
                await fetch(`${wahaUrl}/api/${session}/presence`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ chatId, presence: 'paused' }),
                    signal: AbortSignal.timeout(4000)
                }).catch(() => null);
            }
        }
        catch { }
    }
    async getWahaSessions() {
        const wahaUrl = process.env.WAHA_API_URL;
        if (!wahaUrl)
            return { error: 'WAHA_API_URL no configurado' };
        const apiKey = process.env.WAHA_API_KEY || '';
        const headers = { 'Accept': 'application/json' };
        if (apiKey)
            headers['X-Api-Key'] = apiKey;
        try {
            const response = await fetch(`${wahaUrl}/api/sessions?all=true`, { headers });
            if (!response.ok) {
                return { status: response.status, error: await response.text() };
            }
            return await response.json();
        }
        catch (e) {
            return { error: e.message };
        }
    }
};
exports.WahaAdapterService = WahaAdapterService;
exports.WahaAdapterService = WahaAdapterService = WahaAdapterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_channel_adapter_service_1.MetaChannelAdapterService])
], WahaAdapterService);
//# sourceMappingURL=waha-adapter.service.js.map
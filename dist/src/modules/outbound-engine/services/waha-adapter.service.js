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
    cachedActiveSession = null;
    constructor(prisma, metaChannelAdapter) {
        this.prisma = prisma;
        this.metaChannelAdapter = metaChannelAdapter;
    }
    normalizeJid(rawId) {
        if (!rawId)
            return rawId;
        if (rawId.includes('@c.us') ||
            rawId.includes('@g.us') ||
            rawId.includes('@lid') ||
            rawId.includes('@s.whatsapp.net')) {
            return rawId;
        }
        const cleaned = rawId.replace(/\D/g, '');
        if (!cleaned)
            return rawId;
        if (cleaned.length === 14 || cleaned.length === 15) {
            return `${cleaned}@lid`;
        }
        return `${cleaned}@c.us`;
    }
    async resolveTargetChatId(contactIdOrPhone) {
        let rawTarget = contactIdOrPhone;
        let foundContactId;
        if (contactIdOrPhone && !contactIdOrPhone.includes('@')) {
            const contact = await this.prisma.contact.findFirst({
                where: {
                    OR: [
                        { id: contactIdOrPhone },
                        { externalId: contactIdOrPhone },
                        { phone: contactIdOrPhone },
                        { phoneNormalized: contactIdOrPhone },
                    ],
                },
                select: { id: true, externalId: true, phone: true, phoneNormalized: true },
            });
            if (contact) {
                foundContactId = contact.id;
                rawTarget = contact.externalId || contact.phone || contact.phoneNormalized || contactIdOrPhone;
            }
        }
        const chatId = this.normalizeJid(rawTarget);
        return { chatId, contactId: foundContactId };
    }
    async resolveSession(tenantId) {
        if (process.env.WAHA_SESSION) {
            return process.env.WAHA_SESSION;
        }
        if (tenantId) {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { wahaSession: true },
            });
            if (tenant?.wahaSession) {
                return tenant.wahaSession;
            }
        }
        const tenantWithSession = await this.prisma.tenant.findFirst({
            where: { wahaSession: { not: null } },
            select: { wahaSession: true },
        });
        if (tenantWithSession?.wahaSession) {
            return tenantWithSession.wahaSession;
        }
        if (this.cachedActiveSession) {
            return this.cachedActiveSession;
        }
        try {
            const sessions = await this.getWahaSessions();
            if (Array.isArray(sessions) && sessions.length > 0) {
                const working = sessions.find((s) => s.status === 'WORKING' || s.status === 'CONNECTED' || s.status === 'STARTING') ||
                    sessions[0];
                if (working?.name) {
                    this.cachedActiveSession = working.name;
                    this.logger.log(`[WAHA] Sesión descubierta dinámicamente: "${working.name}"`);
                    return working.name;
                }
            }
        }
        catch {
        }
        return 'default';
    }
    async healContactExternalId(contactId, verifiedJid) {
        if (!contactId || !verifiedJid)
            return;
        try {
            await this.prisma.contact.update({
                where: { id: contactId },
                data: { externalId: verifiedJid },
            });
            this.logger.log(`[Auto-Heal] Contacto ${contactId} auto-reparado con JID verificado: ${verifiedJid}`);
        }
        catch (e) {
            this.logger.debug(`[Auto-Heal] No se pudo actualizar contact ${contactId}: ${e.message}`);
        }
    }
    async executeTypingWithRetry(wahaUrl, session, initialChatId, headers, isStart) {
        let currentChatId = initialChatId;
        const endpoint = isStart ? '/api/startTyping' : '/api/stopTyping';
        const presence = isStart ? 'typing' : 'paused';
        let response = await fetch(`${wahaUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ chatId: currentChatId, session }),
            signal: AbortSignal.timeout(4000),
        }).catch((e) => {
            this.logger.warn(`[WAHA] Falló llamada a ${endpoint}: ${e.message}`);
            return null;
        });
        let errText = '';
        if (response && !response.ok) {
            errText = await response.text().catch(() => '');
        }
        if ((!response || !response.ok) &&
            (errText.includes('No LID for user') || !response?.ok) &&
            currentChatId.endsWith('@c.us')) {
            const lidChatId = currentChatId.replace('@c.us', '@lid');
            this.logger.warn(`[WAHA ${endpoint}] Error con @c.us. Reintentando con ${lidChatId}...`);
            const retryRes = await fetch(`${wahaUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ chatId: lidChatId, session }),
                signal: AbortSignal.timeout(4000),
            }).catch(() => null);
            if (retryRes && retryRes.ok) {
                if (isStart)
                    this.logger.log(`[WAHA] Estado "Escribiendo..." activado exitosamente para ${lidChatId}`);
                return { success: true, usedChatId: lidChatId };
            }
        }
        if ((!response || !response.ok) && currentChatId.endsWith('@lid')) {
            const cusChatId = currentChatId.replace('@lid', '@c.us');
            const retryRes = await fetch(`${wahaUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ chatId: cusChatId, session }),
                signal: AbortSignal.timeout(4000),
            }).catch(() => null);
            if (retryRes && retryRes.ok) {
                if (isStart)
                    this.logger.log(`[WAHA] Estado "Escribiendo..." activado exitosamente para ${cusChatId}`);
                return { success: true, usedChatId: cusChatId };
            }
        }
        if (!response || !response.ok) {
            const presRes = await fetch(`${wahaUrl}/api/${session}/presence`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ chatId: currentChatId, presence }),
                signal: AbortSignal.timeout(4000),
            }).catch(() => null);
            if (presRes && presRes.ok) {
                return { success: true, usedChatId: currentChatId };
            }
        }
        if (response && response.ok) {
            if (isStart)
                this.logger.log(`[WAHA] Estado "Escribiendo..." activado exitosamente para ${currentChatId}`);
            return { success: true, usedChatId: currentChatId };
        }
        return { success: false, usedChatId: currentChatId };
    }
    async startTyping(tenantId, contactIdOrPhone) {
        try {
            const wahaUrl = process.env.WAHA_API_URL;
            if (!wahaUrl)
                return;
            const session = await this.resolveSession(tenantId);
            const apiKey = process.env.WAHA_API_KEY || '';
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            if (apiKey)
                headers['X-Api-Key'] = apiKey;
            const target = await this.resolveTargetChatId(contactIdOrPhone);
            const chatId = target.chatId;
            this.logger.log(`[WAHA] Solicitando estado "Escribiendo..." para ${chatId} (sesión: ${session})`);
            const result = await this.executeTypingWithRetry(wahaUrl, session, chatId, headers, true);
            if (result.success && result.usedChatId !== chatId && target.contactId) {
                await this.healContactExternalId(target.contactId, result.usedChatId);
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
            const session = await this.resolveSession(tenantId);
            const apiKey = process.env.WAHA_API_KEY || '';
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            if (apiKey)
                headers['X-Api-Key'] = apiKey;
            const target = await this.resolveTargetChatId(contactIdOrPhone);
            const chatId = target.chatId;
            await this.executeTypingWithRetry(wahaUrl, session, chatId, headers, false);
        }
        catch {
        }
    }
    async sendMessage(tenantId, contactIdOrPhone, content) {
        let rawPhone = contactIdOrPhone;
        if (rawPhone &&
            (rawPhone.startsWith('ig_') ||
                rawPhone.startsWith('instagram_') ||
                rawPhone.startsWith('fb_') ||
                rawPhone.startsWith('messenger_'))) {
            this.logger.log(`Enrutando mensaje omnicanal hacia Meta (Instagram/FB): ${rawPhone}`);
            return this.metaChannelAdapter.sendMessage(rawPhone, content);
        }
        const target = await this.resolveTargetChatId(contactIdOrPhone);
        let chatId = target.chatId;
        this.logger.log(`Enviando mensaje vía WAHA a ${chatId} (ref: ${contactIdOrPhone})...`);
        const wahaUrl = process.env.WAHA_API_URL;
        if (!wahaUrl) {
            throw new Error('WAHA_API_URL is not configured');
        }
        const session = await this.resolveSession(tenantId);
        const apiKey = process.env.WAHA_API_KEY || '';
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
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
                    session: session,
                }),
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
                        session: session,
                    }),
                });
                if (response.ok && target.contactId) {
                    await this.healContactExternalId(target.contactId, lidChatId);
                }
                if (!response.ok)
                    errBody = await response.text().catch(() => '');
            }
            if (!response.ok && chatId.endsWith('@lid')) {
                const cusChatId = chatId.replace('@lid', '@c.us');
                this.logger.warn(`Envío falló con @lid. Reintentando con ${cusChatId}...`);
                chatId = cusChatId;
                response = await fetch(`${wahaUrl}/api/sendText`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        chatId: cusChatId,
                        text: content,
                        session: session,
                    }),
                });
                if (response.ok && target.contactId) {
                    await this.healContactExternalId(target.contactId, cusChatId);
                }
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
                        session: 'default',
                    }),
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
    async getWahaSessions() {
        const wahaUrl = process.env.WAHA_API_URL;
        if (!wahaUrl)
            return { error: 'WAHA_API_URL no configurado' };
        const apiKey = process.env.WAHA_API_KEY || '';
        const headers = { Accept: 'application/json' };
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
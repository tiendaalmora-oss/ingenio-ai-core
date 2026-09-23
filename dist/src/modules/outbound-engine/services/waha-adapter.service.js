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
    sentBySystemMessageIds = new Map();
    recentOutboundsByTarget = new Map();
    constructor(prisma, metaChannelAdapter) {
        this.prisma = prisma;
        this.metaChannelAdapter = metaChannelAdapter;
    }
    normalizeComparisonText(text) {
        if (!text)
            return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\r\n\t]+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    markMessageAsSentBySystem(messageId) {
        if (!messageId)
            return;
        const idStr = typeof messageId === 'object'
            ? (messageId._serialized || messageId.id || '')
            : String(messageId);
        if (!idStr || idStr === 'waha-msg-ok')
            return;
        const now = Date.now();
        this.sentBySystemMessageIds.set(idStr, now);
        const parts = idStr.split('_');
        if (parts.length >= 2) {
            this.sentBySystemMessageIds.set(parts[parts.length - 1], now);
        }
        const rawSuffix = idStr.replace(/^(true|false)_[^_]+_/, '');
        if (rawSuffix) {
            this.sentBySystemMessageIds.set(rawSuffix, now);
        }
        if (this.sentBySystemMessageIds.size > 500) {
            for (const [id, ts] of this.sentBySystemMessageIds.entries()) {
                if (now - ts > 180_000) {
                    this.sentBySystemMessageIds.delete(id);
                }
            }
        }
    }
    markOutboundDispatched(targetChatIdOrPhone, content) {
        if (!targetChatIdOrPhone || !content)
            return;
        const now = Date.now();
        const textNorm = this.normalizeComparisonText(content);
        if (!textNorm)
            return;
        const digits = targetChatIdOrPhone.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
        const keys = new Set();
        if (digits)
            keys.add(digits);
        if (digits.length >= 10)
            keys.add(digits.slice(-10));
        keys.add(targetChatIdOrPhone);
        for (const key of keys) {
            const list = this.recentOutboundsByTarget.get(key) || [];
            list.push({ textNorm, timestamp: now });
            const filtered = list.filter((e) => now - e.timestamp < 90_000).slice(-10);
            this.recentOutboundsByTarget.set(key, filtered);
        }
        if (this.recentOutboundsByTarget.size > 500) {
            for (const [k, list] of this.recentOutboundsByTarget.entries()) {
                const active = list.filter((e) => now - e.timestamp < 90_000);
                if (active.length === 0) {
                    this.recentOutboundsByTarget.delete(k);
                }
                else {
                    this.recentOutboundsByTarget.set(k, active);
                }
            }
        }
    }
    isSentBySystemContent(targetChatIdOrPhone, content) {
        if (!targetChatIdOrPhone || !content)
            return false;
        const now = Date.now();
        const incomingNorm = this.normalizeComparisonText(content);
        if (!incomingNorm)
            return false;
        const digits = targetChatIdOrPhone.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
        const keysToTest = [digits, digits.length >= 10 ? digits.slice(-10) : '', targetChatIdOrPhone].filter(Boolean);
        for (const key of keysToTest) {
            const list = this.recentOutboundsByTarget.get(key);
            if (!list || list.length === 0)
                continue;
            for (const entry of list) {
                if (now - entry.timestamp > 75_000)
                    continue;
                if (entry.textNorm === incomingNorm ||
                    entry.textNorm.includes(incomingNorm) ||
                    incomingNorm.includes(entry.textNorm) ||
                    (entry.textNorm.length > 20 &&
                        incomingNorm.length > 20 &&
                        entry.textNorm.slice(0, 30) === incomingNorm.slice(0, 30))) {
                    return true;
                }
            }
        }
        return false;
    }
    isSentBySystem(messageId) {
        if (!messageId)
            return false;
        const idStr = typeof messageId === 'object'
            ? (messageId._serialized || messageId.id || '')
            : String(messageId);
        if (!idStr)
            return false;
        if (this.sentBySystemMessageIds.has(idStr))
            return true;
        const parts = idStr.split('_');
        if (parts.length >= 2 && this.sentBySystemMessageIds.has(parts[parts.length - 1])) {
            return true;
        }
        const rawSuffix = idStr.replace(/^(true|false)_[^_]+_/, '');
        if (rawSuffix && this.sentBySystemMessageIds.has(rawSuffix)) {
            return true;
        }
        return false;
    }
    normalizeJid(rawId) {
        if (!rawId)
            return rawId;
        if (rawId.includes('@g.us') || rawId.includes('@lid')) {
            return rawId;
        }
        const cleaned = rawId.replace(/\D/g, '');
        if (!cleaned)
            return rawId;
        if (cleaned.length >= 14 && cleaned.length <= 16) {
            return `${cleaned}@lid`;
        }
        if (rawId.includes('@c.us') || rawId.includes('@s.whatsapp.net')) {
            return rawId;
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
        else if (contactIdOrPhone) {
            const cleanDigits = contactIdOrPhone.replace(/\D/g, '');
            const contact = await this.prisma.contact.findFirst({
                where: {
                    OR: [
                        { externalId: contactIdOrPhone },
                        { phone: cleanDigits },
                        { phoneNormalized: cleanDigits },
                    ],
                },
                select: { id: true },
            });
            if (contact) {
                foundContactId = contact.id;
            }
        }
        const chatId = this.normalizeJid(rawTarget);
        return { chatId, contactId: foundContactId };
    }
    resolveWahaConfig(tenantId, sessionName) {
        const isProd = tenantId === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' ||
            sessionName === 'ferreos';
        if (isProd) {
            const rawUrl = process.env.WAHA_PROD_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
            return {
                apiUrl: rawUrl.replace(/\/+$/, ''),
                apiKey: process.env.WAHA_PROD_API_KEY || process.env.WAHA_API_KEY || '',
                isProd: true,
            };
        }
        const rawUrl = process.env.WAHA_SANDBOX_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
        return {
            apiUrl: rawUrl.replace(/\/+$/, ''),
            apiKey: process.env.WAHA_SANDBOX_API_KEY || process.env.WAHA_API_KEY || '',
            isProd: false,
        };
    }
    async resolveSession(tenantId) {
        if (tenantId) {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { wahaSession: true },
            });
            if (tenant?.wahaSession) {
                return tenant.wahaSession;
            }
        }
        if (process.env.WAHA_SESSION) {
            return process.env.WAHA_SESSION;
        }
        const prodTenant = await this.prisma.tenant.findFirst({
            where: {
                OR: [
                    { id: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' },
                    { wahaSession: 'ferreos' }
                ]
            },
            select: { wahaSession: true },
        });
        if (prodTenant?.wahaSession) {
            return prodTenant.wahaSession;
        }
        if (this.cachedActiveSession) {
            return this.cachedActiveSession;
        }
        try {
            const sessions = await this.getWahaSessions('prod');
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
        return 'ferreos';
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
        if ((!response || !response.ok) && currentChatId.endsWith('@c.us')) {
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
            const session = await this.resolveSession(tenantId);
            const config = this.resolveWahaConfig(tenantId, session);
            if (!config.apiUrl)
                return;
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            if (config.apiKey)
                headers['X-Api-Key'] = config.apiKey;
            const target = await this.resolveTargetChatId(contactIdOrPhone);
            const chatId = target.chatId;
            this.logger.log(`[WAHA] Solicitando estado "Escribiendo..." para ${chatId} (sesión: ${session}, host: ${config.apiUrl})`);
            const result = await this.executeTypingWithRetry(config.apiUrl, session, chatId, headers, true);
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
            const session = await this.resolveSession(tenantId);
            const config = this.resolveWahaConfig(tenantId, session);
            if (!config.apiUrl)
                return;
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            if (config.apiKey)
                headers['X-Api-Key'] = config.apiKey;
            const target = await this.resolveTargetChatId(contactIdOrPhone);
            const chatId = target.chatId;
            await this.executeTypingWithRetry(config.apiUrl, session, chatId, headers, false);
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
        const session = await this.resolveSession(tenantId);
        const config = this.resolveWahaConfig(tenantId, session);
        if (!config.apiUrl) {
            throw new Error('WAHA API URL is not configured');
        }
        this.logger.log(`Enviando mensaje vía WAHA [${config.isProd ? 'PROD' : 'SANDBOX'}] (${config.apiUrl}) a ${chatId} (ref: ${contactIdOrPhone})...`);
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (config.apiKey) {
            headers['X-Api-Key'] = config.apiKey;
        }
        this.markOutboundDispatched(chatId, content);
        if (contactIdOrPhone && contactIdOrPhone !== chatId) {
            this.markOutboundDispatched(contactIdOrPhone, content);
        }
        try {
            let response = await fetch(`${config.apiUrl}/api/sendText`, {
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
            if (!response.ok && chatId.endsWith('@c.us')) {
                const lidChatId = chatId.replace('@c.us', '@lid');
                this.logger.warn(`[WAHA] Envío falló con @c.us (${response.status}). Reintentando con ${lidChatId}...`);
                chatId = lidChatId;
                this.markOutboundDispatched(lidChatId, content);
                response = await fetch(`${config.apiUrl}/api/sendText`, {
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
                this.logger.warn(`[WAHA] Envío falló con @lid (${response.status}). Reintentando con ${cusChatId}...`);
                chatId = cusChatId;
                this.markOutboundDispatched(cusChatId, content);
                response = await fetch(`${config.apiUrl}/api/sendText`, {
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
            if (!response.ok) {
                throw new Error(`Waha response con error ${response.status}: ${response.statusText}. Body: ${errBody}`);
            }
            const result = await response.json().catch(() => ({}));
            const rawId = result?.id?._serialized || result?.id || result?.key?.id || result?._data?.id?._serialized || 'waha-msg-ok';
            const messageId = typeof rawId === 'object' ? (rawId._serialized || rawId.id || 'waha-msg-ok') : String(rawId);
            if (messageId && messageId !== 'waha-msg-ok') {
                this.markMessageAsSentBySystem(messageId);
            }
            this.logger.log(`Mensaje entregado exitosamente a WAHA. MessageId: ${messageId}`);
            return messageId;
        }
        catch (err) {
            this.logger.error(`Excepción comunicando con WAHA para ${chatId}: ${err.message}`);
            throw err;
        }
    }
    async getWahaSessions(target = 'prod') {
        const prodConfig = this.resolveWahaConfig('dba1c54c-89c6-41e9-ae9d-03613377a5b3', 'ferreos');
        const sandboxConfig = this.resolveWahaConfig('subaccount-test', 'sub_sandbox');
        const fetchSessions = async (config) => {
            if (!config.apiUrl)
                return { error: 'WAHA URL no configurado' };
            const headers = { Accept: 'application/json' };
            if (config.apiKey)
                headers['X-Api-Key'] = config.apiKey;
            try {
                const response = await fetch(`${config.apiUrl}/api/sessions?all=true`, {
                    headers,
                    signal: AbortSignal.timeout(4000),
                });
                if (!response.ok) {
                    return { status: response.status, error: await response.text() };
                }
                return await response.json();
            }
            catch (e) {
                return { error: e.message };
            }
        };
        if (target === 'all') {
            const [prod, sandbox] = await Promise.all([
                fetchSessions(prodConfig),
                fetchSessions(sandboxConfig),
            ]);
            return { prod, sandbox };
        }
        if (target === 'sandbox') {
            return fetchSessions(sandboxConfig);
        }
        return fetchSessions(prodConfig);
    }
};
exports.WahaAdapterService = WahaAdapterService;
exports.WahaAdapterService = WahaAdapterService = WahaAdapterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_channel_adapter_service_1.MetaChannelAdapterService])
], WahaAdapterService);
//# sourceMappingURL=waha-adapter.service.js.map
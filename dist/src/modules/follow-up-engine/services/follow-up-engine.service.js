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
var FollowUpEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpEngineService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let FollowUpEngineService = FollowUpEngineService_1 = class FollowUpEngineService {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(FollowUpEngineService_1.name);
    DEFAULT_START_HOUR = 7;
    DEFAULT_END_HOUR = 22;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async evaluateFollowUps() {
        const now = new Date();
        const report = {
            timestamp: now.toISOString(),
            isWindowAllowed: false,
            activeConversationsFound: 0,
            evaluatedTenants: [],
            dispatched: [],
            skipped: [],
        };
        const allowed = this.isWithinAllowedWindow(now, this.DEFAULT_START_HOUR, this.DEFAULT_END_HOUR);
        report.isWindowAllowed = allowed;
        if (!allowed) {
            this.logger.debug(`[FollowUpEngine] Fuera de ventana horaria (${this.DEFAULT_START_HOUR}:00 - ${this.DEFAULT_END_HOUR}:59 VET). Seguimientos suspendidos.`);
            return report;
        }
        await this.evaluatePostSaleUpsells(now);
        const activeConversations = await this.prisma.conversation.findMany({
            where: {
                status: { in: ['NEW', 'ACTIVE'] }
            },
            include: {
                contact: {
                    include: { memory: true }
                },
                interactions: {
                    orderBy: { timestamp: 'desc' },
                    take: 20
                }
            }
        });
        report.activeConversationsFound = activeConversations.length;
        if (!activeConversations.length) {
            return report;
        }
        const tenantIds = [...new Set(activeConversations.map(c => c.contact.tenantId))];
        for (const tenantId of tenantIds) {
            const bundle = await this.prisma.knowledgeBundle.findUnique({
                where: { tenantId }
            });
            if (!bundle) {
                report.skipped.push({ tenantId, reason: 'No KnowledgeBundle found' });
                continue;
            }
            const systemPrompt = bundle.systemPrompt || {};
            const rawData = typeof systemPrompt === 'string' ? JSON.parse(systemPrompt) : (systemPrompt['_raw'] || systemPrompt);
            const rawSeguimientos = rawData['seguimientos'] || rawData['followups'] || systemPrompt['followups'] || systemPrompt['seguimientos'] || rawData['scriptsComerciales'];
            const rules = this.extractFollowUpRules(rawSeguimientos);
            if (!rules.length) {
                report.skipped.push({ tenantId, reason: 'No follow-up rules configured or parsed' });
                continue;
            }
            const sortedRules = [...rules].sort((a, b) => this.parseDelayMs(a) - this.parseDelayMs(b));
            const tenantConvos = activeConversations.filter(c => c.contact.tenantId === tenantId);
            report.evaluatedTenants.push({
                tenantId,
                rulesCount: sortedRules.length,
                conversationsCount: tenantConvos.length
            });
            for (const convo of tenantConvos) {
                const contactMem = convo.contact.memory;
                const leadStatus = (contactMem?.leadStatus || '').toUpperCase();
                const contactTags = Array.isArray(contactMem?.tags)
                    ? contactMem.tags.map((t) => String(t).toUpperCase())
                    : [];
                const isBuyerStatus = ['CLOSED', 'PAGADO', 'CLIENT', 'CLIENTE', 'SALE', 'VENTA'].includes(leadStatus);
                const hasPaymentTag = contactTags.some((t) => ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO', 'PAGADO', 'CLIENTE', 'ACCESO_ENTREGADO', 'VENTA_CERRADA'].includes(t));
                const hasVoucherInHistory = convo.interactions.some((i) => {
                    const content = i.content || '';
                    return (content.includes('Comprobante de Pago Detectado') ||
                        content.includes('Venta manual confirmada') ||
                        content.includes('Listo profe enviado') ||
                        content.includes('Ya registramos tu comprobante'));
                });
                if (isBuyerStatus || hasPaymentTag || hasVoucherInHistory) {
                    report.skipped.push({
                        conversationId: convo.id,
                        contact: convo.contact.phone,
                        reason: `Lead is already a verified buyer (leadStatus: ${leadStatus}, tags: [${contactTags.join(', ')}], voucher: ${hasVoucherInHistory})`
                    });
                    continue;
                }
                const lastInteraction = convo.interactions.length > 0 ? convo.interactions[0] : null;
                if (!lastInteraction) {
                    report.skipped.push({ conversationId: convo.id, contact: convo.contact.phone, reason: 'No interactions found' });
                    continue;
                }
                if (lastInteraction.direction !== 'OUTBOUND') {
                    report.skipped.push({
                        conversationId: convo.id,
                        contact: convo.contact.phone,
                        reason: `Last interaction was ${lastInteraction.direction}, waiting for bot response, not follow-up`
                    });
                    continue;
                }
                const lastInbound = convo.interactions.find(i => i.direction === 'INBOUND');
                const silenceStart = lastInbound
                    ? lastInbound.timestamp
                    : (convo.interactions[convo.interactions.length - 1]?.timestamp || lastInteraction.timestamp);
                const timeSinceSilence = Date.now() - silenceStart.getTime();
                const elapsedMinutes = Math.round(timeSinceSilence / 60000);
                const elapsedDays = Math.floor(timeSinceSilence / (24 * 60 * 60 * 1000));
                for (const rule of sortedRules) {
                    const delayMs = this.parseDelayMs(rule);
                    if (timeSinceSilence >= delayMs) {
                        const ruleIdentifier = rule.id || `rule-${(rule.tiempo || 'default').replace(/\s+/g, '')}-${delayMs}`;
                        const alreadyDispatched = await this.prisma.pendingOutboundMessage.findFirst({
                            where: {
                                conversationId: convo.id,
                                followUpId: ruleIdentifier,
                                status: { in: ['PENDING', 'PROCESSING', 'SENT'] },
                                ...(lastInbound ? { createdAt: { gte: lastInbound.timestamp } } : {})
                            }
                        });
                        if (alreadyDispatched) {
                            report.skipped.push({
                                conversationId: convo.id,
                                contact: convo.contact.phone,
                                rule: ruleIdentifier,
                                reason: `Already dispatched in current silence cycle (Status: ${alreadyDispatched.status})`
                            });
                            continue;
                        }
                        const payload = {
                            tenantId: tenantId,
                            conversationId: convo.id,
                            contactId: convo.contactId,
                            followUpId: ruleIdentifier,
                            ruleApplied: rule,
                            elapsedDays,
                            elapsedMinutes,
                            timestamp: new Date()
                        };
                        this.logger.log(`[FollowUpEngine] 🚀 Disparando seguimiento para ${convo.contact.name || convo.contact.phone || convo.contactId} (silencio de ${elapsedDays} días / ${elapsedMinutes} min), regla: "${rule.tiempo || ruleIdentifier}"`);
                        this.eventEmitter.emit('FOLLOW_UP_PENDING', payload);
                        report.dispatched.push({
                            conversationId: convo.id,
                            contact: convo.contact.phone || convo.contactId,
                            rule: rule.tiempo || ruleIdentifier,
                            elapsedDays,
                            elapsedMinutes
                        });
                        break;
                    }
                }
            }
        }
        return report;
    }
    extractFollowUpRules(raw) {
        if (!raw)
            return [];
        if (Array.isArray(raw)) {
            return raw.map((item, idx) => {
                if (typeof item === 'string') {
                    return { id: `rule-${idx}`, tiempo: item, condicion: item, instruccion: item };
                }
                return item;
            });
        }
        if (typeof raw === 'object') {
            if (Array.isArray(raw.reglas))
                return this.extractFollowUpRules(raw.reglas);
            if (Array.isArray(raw.items))
                return this.extractFollowUpRules(raw.items);
            if (typeof raw.text === 'string')
                return this.extractFollowUpRules(raw.text);
            if (typeof raw.prompt === 'string')
                return this.extractFollowUpRules(raw.prompt);
        }
        if (typeof raw === 'string') {
            const text = raw.trim();
            if (!text)
                return [];
            const lines = text
                .split(/\n+/)
                .map(l => l.trim())
                .filter(l => l.length > 0 && !l.startsWith('#'));
            const rules = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const timeMatch = line.match(/(\d+)\s*(?:minutos?|mins?|m\b|horas?|hrs?|h\b|d[ií]as?|d\b)/i);
                if (timeMatch) {
                    rules.push({
                        id: `rule-text-${i}-${timeMatch[0].replace(/\s+/g, '')}`,
                        tiempo: timeMatch[0],
                        condicion: line,
                        instruccion: line,
                        nombre: `Seguimiento (${timeMatch[0]})`
                    });
                }
            }
            if (rules.length > 0)
                return rules;
            return [
                { id: 'rule-auto-5m', tiempo: '5 minutos', condicion: text, instruccion: text, nombre: 'Seguimiento 5 min' },
                { id: 'rule-auto-1h', tiempo: '1 hora', condicion: text, instruccion: text, nombre: 'Seguimiento 1 hora' }
            ];
        }
        return [];
    }
    isWithinAllowedWindow(now, startHour, endHour) {
        try {
            const hourStr = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                hour12: false,
                timeZone: 'America/Caracas',
            }).format(now);
            const localHour = parseInt(hourStr, 10);
            if (isNaN(localHour))
                return true;
            return localHour >= startHour && localHour < endHour;
        }
        catch {
            const currentHour = now.getHours();
            return currentHour >= startHour && currentHour < endHour;
        }
    }
    parseDelayMs(rule) {
        if (rule.delayHours && !isNaN(Number(rule.delayHours))) {
            return Number(rule.delayHours) * 60 * 60 * 1000;
        }
        if (rule.delayMinutes && !isNaN(Number(rule.delayMinutes))) {
            return Number(rule.delayMinutes) * 60 * 1000;
        }
        const text = `${rule.tiempo || ''} ${rule.condition || ''} ${rule.condicion || ''} ${rule.nombre || ''} ${rule.instruccion || ''}`.toLowerCase();
        const minMatch = text.match(/(\d+)\s*(?:m|min|minuto|minutos|mins)\b/);
        if (minMatch)
            return parseInt(minMatch[1], 10) * 60 * 1000;
        const hoursMatch = text.match(/(\d+)\s*(?:h|hora|horas|hr|hrs)\b/);
        if (hoursMatch)
            return parseInt(hoursMatch[1], 10) * 60 * 60 * 1000;
        const daysMatch = text.match(/(\d+)\s*(?:d|dia|dias|día|días)\b/);
        if (daysMatch)
            return parseInt(daysMatch[1], 10) * 24 * 60 * 60 * 1000;
        const numMatch = text.match(/\b(\d+)\b/);
        if (numMatch) {
            const val = parseInt(numMatch[1], 10);
            return val <= 10 ? val * 60 * 1000 : val * 60 * 60 * 1000;
        }
        return 5 * 60 * 1000;
    }
    async evaluatePostSaleUpsells(now) {
        try {
            const bundles = await this.prisma.knowledgeBundle.findMany();
            for (const bundle of bundles) {
                const tenantId = bundle.tenantId;
                const systemPrompt = bundle.systemPrompt || {};
                const rawData = typeof systemPrompt === 'string' ? JSON.parse(systemPrompt) : (systemPrompt['_raw'] || systemPrompt);
                const rawReglas = rawData.reglasBot || systemPrompt.reglasBot || systemPrompt.botRules || {};
                const reglasBot = (rawReglas.data && typeof rawReglas.data === 'object') ? { ...rawReglas.data, ...rawReglas } : rawReglas;
                const isPostSaleEnabled = reglasBot.enablePostSaleUpsell !== false && Boolean(reglasBot.postSaleMessage && String(reglasBot.postSaleMessage).trim());
                if (!isPostSaleEnabled) {
                    continue;
                }
                const delayMinutes = Number(reglasBot.postSaleDelayMinutes) || 45;
                const postSaleMessage = String(reglasBot.postSaleMessage).trim();
                const candidateContacts = await this.prisma.contact.findMany({
                    where: {
                        tenantId,
                        memory: {
                            OR: [
                                { leadStatus: { in: ['CLOSED', 'PAGADO', 'CLIENT', 'CLIENTE', 'SALE', 'VENTA'] } },
                                { tags: { hasSome: ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO', 'PAGADO'] } }
                            ]
                        }
                    },
                    include: {
                        memory: true,
                        conversations: {
                            orderBy: { id: 'desc' },
                            take: 1,
                            include: {
                                interactions: {
                                    orderBy: { timestamp: 'desc' },
                                    take: 15
                                }
                            }
                        }
                    }
                });
                for (const contact of candidateContacts) {
                    const currentTags = Array.isArray(contact.memory?.tags)
                        ? contact.memory.tags.map((t) => String(t).toUpperCase())
                        : [];
                    if (currentTags.includes('VENTA_ANULADA') ||
                        currentTags.includes('PAGO_FALSO') ||
                        currentTags.includes('PAGO_RECHAZADO') ||
                        currentTags.includes('POST_VENTA_ENVIADA') ||
                        currentTags.includes('POST_SALE_SENT')) {
                        continue;
                    }
                    const conv = contact.conversations[0];
                    if (!conv)
                        continue;
                    const alreadyQueued = await this.prisma.pendingOutboundMessage.findFirst({
                        where: {
                            conversationId: conv.id,
                            followUpId: 'post-sale-upsell'
                        }
                    });
                    if (alreadyQueued)
                        continue;
                    const voucherInteraction = conv.interactions.find((i) => {
                        const content = i.content || '';
                        return ((i.direction === 'INBOUND' && (i.type === 'IMAGE' || content.toLowerCase().includes('comprobante') || content.toLowerCase().includes('referencia') || content.toLowerCase().includes('pago'))) ||
                            (i.direction === 'OUTBOUND' && (content.includes('Comprobante de Pago Detectado') || content.includes('Ya registramos tu comprobante') || content.includes('recibido tu comprobante'))));
                    });
                    const paymentTime = voucherInteraction?.timestamp || contact.memory?.updatedAt || (conv.interactions[conv.interactions.length - 1]?.timestamp) || new Date();
                    const elapsedMinutes = Math.floor((now.getTime() - new Date(paymentTime).getTime()) / 60000);
                    if (elapsedMinutes < delayMinutes) {
                        continue;
                    }
                    const personalizedMsg = postSaleMessage.replace(/\{nombre\}/gi, contact.name || 'profe');
                    await this.prisma.pendingOutboundMessage.create({
                        data: {
                            tenantId,
                            conversationId: conv.id,
                            contactId: contact.id,
                            message: personalizedMsg,
                            followUpId: 'post-sale-upsell',
                            status: 'PENDING'
                        }
                    });
                    const newTags = Array.from(new Set([...(contact.memory?.tags || []), 'POST_VENTA_ENVIADA']));
                    await this.prisma.businessMemory.update({
                        where: { contactId: contact.id },
                        data: { tags: newTags }
                    });
                    await this.prisma.interaction.create({
                        data: {
                            conversationId: conv.id,
                            direction: 'OUTBOUND',
                            type: 'TEXT',
                            content: `🎁 [Automatización Post-Venta 50% OFF]: Disparada automáticamente tras cumplirse la ventana de seguridad (${elapsedMinutes} min transcurridos vs ${delayMinutes} min configurados).`,
                            role: 'assistant',
                            timestamp: new Date()
                        }
                    });
                    this.logger.log(`[PostSaleEngine] 🚀 Encolada oferta post-venta 50% OFF para ${contact.name || contact.phone || contact.id} (${elapsedMinutes} min tras comprobante)`);
                }
            }
        }
        catch (e) {
            this.logger.error(`[PostSaleEngine] Error evaluando ofertas post-venta: ${e.message}`, e.stack);
        }
    }
};
exports.FollowUpEngineService = FollowUpEngineService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FollowUpEngineService.prototype, "evaluateFollowUps", null);
exports.FollowUpEngineService = FollowUpEngineService = FollowUpEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], FollowUpEngineService);
//# sourceMappingURL=follow-up-engine.service.js.map